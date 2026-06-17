"""
Spartan Coaching - FastAPI Backend
Powers a React Native / Expo iOS mobile app
Database : Replit PostgreSQL (asyncpg)
AI       : OpenAI (openai library)
Payments : Stripe (stripe library)
Email    : Resend (resend library)
"""
import os
import uuid
import logging
import asyncio
import re as _re
from datetime import datetime, date, timezone, timedelta
from typing import Optional, List, Literal

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field, EmailStr

import asyncpg
import resend
import openai
import stripe as stripe_lib
from collections import defaultdict, deque
import time as _time

from content import (
    SPARTAN_SYSTEM_INSTRUCTION,
    ROLEPLAY_CHARACTERS,
    ROLEPLAY_FEEDBACK_PROMPT_TEMPLATE,
    ALL_DRILLS,
    KNOWLEDGE_BASE_ENTRIES,
)
from repo_content import (
    TESTIMONIALS as REPO_TESTIMONIALS,
    CASE_STUDIES as REPO_CASE_STUDIES,
    ARTICLES as REPO_ARTICLES,
    PODCASTS as REPO_PODCASTS,
    RESOURCES as REPO_RESOURCES,
)

# ---------- Config ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("spartan")

DATABASE_URL      = os.environ.get("DATABASE_URL")
OPENAI_API_KEY    = os.environ.get("OPENAI_API_KEY")
RESEND_API_KEY    = os.environ.get("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
RESEND_FROM_NAME  = os.environ.get("RESEND_FROM_NAME", "Spartan Coaching App")
CONTACT_EMAIL     = os.environ.get("CONTACT_EMAIL", "nick@spartanhospicecoaching.com")
LLM_MODEL         = os.environ.get("LLM_MODEL", "gpt-4o")
LLM_MODEL_FAST    = os.environ.get("LLM_MODEL_FAST", "gpt-4o-mini")
ADMIN_TOKEN       = os.environ.get("ADMIN_TOKEN", "spartan-admin")
BETA_UNLOCK_ENABLED = os.environ.get("BETA_UNLOCK_ENABLED", "0") == "1"
STRIPE_API_KEY          = os.environ.get("STRIPE_API_KEY")
STRIPE_WEBHOOK_SECRET   = os.environ.get("STRIPE_WEBHOOK_SECRET")
STRIPE_PRO_PRICE_ID     = os.environ.get("STRIPE_PRO_PRICE_ID")
STRIPE_TEAM_5_PRICE_ID  = os.environ.get("STRIPE_TEAM_5_PRICE_ID")
STRIPE_TEAM_10_PRICE_ID = os.environ.get("STRIPE_TEAM_10_PRICE_ID")
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ALLOWED_ORIGINS", "*").split(",")
    if o.strip()
]

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

if STRIPE_API_KEY:
    stripe_lib.api_key = STRIPE_API_KEY

openai_client: Optional[openai.AsyncOpenAI] = (
    openai.AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
)

pool: Optional[asyncpg.Pool] = None

# ---------- App ----------
app = FastAPI(title="Spartan Coaching API")
api = APIRouter(prefix="/api")


@app.get("/", include_in_schema=False)
async def health():
    return {"status": "ok"}


@app.exception_handler(HTTPException)
async def _http_exc_handler(request: Request, exc: HTTPException):
    """Return flat JSON for 402 subscription errors; standard envelope for everything else."""
    if exc.status_code == 402 and isinstance(exc.detail, dict):
        return JSONResponse(status_code=402, content=exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _send_payment_failure_alert(event_type: str, sub_id: str, customer_id: str, status: str, extra: str = "") -> None:
    """Best-effort alert email to CONTACT_EMAIL when a subscription payment fails (card decline, past_due, etc.)."""
    if not RESEND_API_KEY or not CONTACT_EMAIL:
        logger.warning("payment failure alert skipped: RESEND_API_KEY or CONTACT_EMAIL not set")
        return
    try:
        _subject = f"[Spartan] Payment failed — subscription {status}"
        _rows = ""
        if sub_id:
            _rows += f'<tr><td style="color:#a3a3ad;padding:6px 0;width:140px;">Subscription ID</td><td style="color:#e5e5e5;font-family:monospace;">{sub_id}</td></tr>'
        if customer_id:
            _rows += f'<tr><td style="color:#a3a3ad;padding:6px 0;">Customer ID</td><td style="color:#e5e5e5;font-family:monospace;">{customer_id}</td></tr>'
        if status:
            _rows += f'<tr><td style="color:#a3a3ad;padding:6px 0;">Status</td><td style="color:#f87171;font-family:monospace;">{status}</td></tr>'
        if extra:
            _rows += f'<tr><td style="color:#a3a3ad;padding:6px 0;">Detail</td><td style="color:#e5e5e5;font-family:monospace;">{extra}</td></tr>'
        _html = f"""
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
            background:#0a0a0b;color:#e5e5e5;padding:32px 24px;max-width:680px;margin:0 auto;">
  <p style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;
            color:#ef4444;margin:0 0 12px;">Spartan Coaching — Payment Alert</p>
  <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0 0 20px;">
    Subscription payment failed
  </h1>
  <p style="color:#a3a3ad;margin:0 0 20px;">
    A customer&rsquo;s subscription renewal could not be charged. Their access has been downgraded.
    Reach out to the customer before they churn.
  </p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">{_rows}</table>
  <p style="color:#a3a3ad;font-size:13px;margin:0 0 8px;">
    View the customer in the Stripe dashboard to see the failed charge and retry or update their card.
  </p>
  <p style="color:#52525b;font-size:12px;margin:0;">
    Stripe Dashboard → Customers → search by customer ID above
  </p>
</div>"""
        _loop = asyncio.get_event_loop()
        await _loop.run_in_executor(
            None,
            lambda: resend.Emails.send({
                "from": f"{RESEND_FROM_NAME} <{RESEND_FROM_EMAIL}>",
                "to": [CONTACT_EMAIL],
                "subject": _subject,
                "html": _html,
            }),
        )
        logger.info("payment failure alert sent to %s (event=%s sub=%s status=%s)", CONTACT_EMAIL, event_type, sub_id, status)
    except Exception as _ae:
        logger.error("failed to send payment failure alert: %s", _ae)


async def _send_webhook_failure_alert(event_type: str, exc: Exception) -> None:
    """Best-effort alert email to CONTACT_EMAIL when stripe_webhook crashes unexpectedly."""
    if not RESEND_API_KEY or not CONTACT_EMAIL:
        logger.warning("webhook alert skipped: RESEND_API_KEY or CONTACT_EMAIL not set")
        return
    try:
        import traceback as _tb
        _trace = _tb.format_exc()
        _subject = f"[Spartan] Stripe webhook error — {event_type or 'unknown event'}"
        _html = f"""
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
            background:#0a0a0b;color:#e5e5e5;padding:32px 24px;max-width:680px;margin:0 auto;">
  <p style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;
            color:#ef4444;margin:0 0 12px;">Spartan Coaching — Webhook Alert</p>
  <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0 0 20px;">
    Stripe webhook raised an unexpected error
  </h1>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <tr><td style="color:#a3a3ad;padding:6px 0;width:110px;">Event type</td>
        <td style="color:#e5e5e5;font-family:monospace;">{event_type or "(unknown)"}</td></tr>
    <tr><td style="color:#a3a3ad;padding:6px 0;">Error</td>
        <td style="color:#f87171;font-family:monospace;">{type(exc).__name__}: {exc}</td></tr>
  </table>
  <pre style="background:#141417;border:1px solid #26262c;border-radius:10px;padding:16px;
              overflow-x:auto;white-space:pre-wrap;color:#fca5a5;font-size:12px;
              font-family:monospace;margin-bottom:24px;">{_trace}</pre>
  <p style="color:#a3a3ad;font-size:13px;margin:0 0 8px;">
    Stripe will retry this event automatically. Check the Stripe dashboard for delivery status.
  </p>
  <p style="color:#52525b;font-size:12px;margin:0;">
    Stripe Dashboard → Developers → Webhooks → webhook → Recent events
  </p>
</div>"""
        _loop = asyncio.get_event_loop()
        await _loop.run_in_executor(
            None,
            lambda: resend.Emails.send({
                "from": f"{RESEND_FROM_NAME} <{RESEND_FROM_EMAIL}>",
                "to": [CONTACT_EMAIL],
                "subject": _subject,
                "html": _html,
            }),
        )
        logger.info("webhook failure alert sent to %s (event=%s)", CONTACT_EMAIL, event_type)
    except Exception as _ae:
        logger.error("failed to send webhook failure alert: %s", _ae)


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions from the Stripe webhook route and send an alert email."""
    logger.exception("unhandled exception on %s", request.url.path)
    if "/webhook/stripe" in request.url.path:
        event_type = getattr(request.state, "stripe_event_type", "")
        await _send_webhook_failure_alert(event_type, exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


_PRIVACY_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy — Spartan Coaching</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0d0d0d;
      color: #e5e5e5;
      line-height: 1.7;
      padding: 2rem 1rem 4rem;
    }
    .container { max-width: 720px; margin: 0 auto; }
    header { margin-bottom: 2.5rem; }
    header .brand { font-size: 0.85rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #f97316; margin-bottom: 0.75rem; }
    h1 { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; }
    .subtitle { color: #999; font-size: 0.9rem; }
    section { margin-bottom: 2rem; }
    h2 { font-size: 1.1rem; font-weight: 600; color: #fff; margin-bottom: 0.75rem; padding-bottom: 0.4rem; border-bottom: 1px solid #222; }
    p { color: #ccc; margin-bottom: 0.75rem; }
    ul { list-style: none; padding: 0; }
    ul li { color: #ccc; padding: 0.35rem 0 0.35rem 1.4rem; position: relative; }
    ul li::before { content: "✓"; position: absolute; left: 0; color: #f97316; font-size: 0.85rem; }
    a { color: #f97316; text-decoration: none; }
    a:hover { text-decoration: underline; }
    footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #222; font-size: 0.8rem; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">Spartan Coaching</div>
      <h1>Privacy Policy</h1>
      <p class="subtitle">Effective date: January 1, 2025 &nbsp;·&nbsp; Last updated: June 2025</p>
    </header>

    <section>
      <h2>Overview</h2>
      <p>
        Spartan Coaching collects only the information needed to deliver coaching services and
        respond to inquiries — your name, email, company, and the questions you ask. We are
        committed to handling that information responsibly.
      </p>
    </section>

    <section>
      <h2>Information We Collect</h2>
      <ul>
        <li>Name, email address, phone number, and company name (submitted via contact forms)</li>
        <li>Questions and messages you send through the app or website</li>
        <li>Device-scoped identifiers (not linked to your identity) used to track drill streaks within the app</li>
      </ul>
    </section>

    <section>
      <h2>How We Use Your Information</h2>
      <ul>
        <li>To respond to inquiries and deliver coaching services you have requested</li>
        <li>To send transactional emails (booking confirmations, document delivery)</li>
        <li>To improve the coaching content and app experience</li>
      </ul>
    </section>

    <section>
      <h2>Third-Party Processors</h2>
      <p>We share data only with the processors necessary to operate the service:</p>
      <ul>
        <li><strong>OpenAI</strong> — AI coaching conversations are processed under our enterprise agreement; no PHI is stored or used for model training.</li>
        <li><strong>Resend</strong> — Transactional email delivery. Email content is retained per Resend&rsquo;s standard retention policy.</li>
        <li><strong>Stripe</strong> — Payment processing for coaching engagements. Card data is handled entirely by Stripe; we never see or store raw payment details.</li>
      </ul>
    </section>

    <section>
      <h2>Data Sharing &amp; Sale</h2>
      <ul>
        <li>We never sell, rent, or trade your personal data to third parties.</li>
        <li>We do not use your data for advertising or behavioral profiling.</li>
      </ul>
    </section>

    <section>
      <h2>HIPAA &amp; Protected Health Information</h2>
      <ul>
        <li>The app is designed to never collect, store, or transmit Protected Health Information (PHI).</li>
        <li>The Eligibility Quick Check feature is anonymous — no patient identifiers are collected or stored.</li>
        <li>For corporate engagements that may involve PHI, a Business Associate Agreement (BAA) is available on request.</li>
      </ul>
    </section>

    <section>
      <h2>Data Retention</h2>
      <p>
        Contact submissions are retained for as long as necessary to fulfill the service request and for
        reasonable follow-up. You may request deletion of any personal data we hold at any time.
      </p>
    </section>

    <section>
      <h2>Your Rights &amp; Data Deletion</h2>
      <p>
        You have the right to access, correct, or delete the personal data we hold about you.
        To exercise any of these rights, email us at
        <a href="mailto:nick@spartanhospicecoaching.com">nick@spartanhospicecoaching.com</a>
        and we will respond within 30 days.
      </p>
    </section>

    <section>
      <h2>Security</h2>
      <p>
        We use industry-standard measures to protect your data, including encrypted connections (TLS),
        access controls, and a managed PostgreSQL database hosted on Replit&rsquo;s infrastructure.
      </p>
    </section>

    <section>
      <h2>Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. Continued use of the app after an update
        constitutes acceptance of the revised policy. The &ldquo;Last updated&rdquo; date at the top of this
        page reflects the most recent revision.
      </p>
    </section>

    <section>
      <h2>Contact</h2>
      <p>
        Spartan Coaching<br />
        Nick Lynch<br />
        <a href="mailto:nick@spartanhospicecoaching.com">nick@spartanhospicecoaching.com</a>
      </p>
    </section>

    <footer>
      &copy; 2025 Spartan Coaching. All rights reserved.
    </footer>
  </div>
</body>
</html>"""


@app.get("/privacy", response_class=HTMLResponse, include_in_schema=False)
async def privacy_policy():
    return HTMLResponse(content=_PRIVACY_HTML, status_code=200)


_TERMS_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Terms of Service — Spartan Coaching</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0d0d0d;
      color: #e5e5e5;
      line-height: 1.7;
      padding: 2rem 1rem 4rem;
    }
    .container { max-width: 720px; margin: 0 auto; }
    header { margin-bottom: 2.5rem; }
    header .brand { font-size: 0.85rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #f97316; margin-bottom: 0.75rem; }
    h1 { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; }
    .subtitle { color: #999; font-size: 0.9rem; }
    section { margin-bottom: 2rem; }
    h2 { font-size: 1.1rem; font-weight: 600; color: #fff; margin-bottom: 0.75rem; padding-bottom: 0.4rem; border-bottom: 1px solid #222; }
    p { color: #ccc; margin-bottom: 0.75rem; }
    ul { list-style: none; padding: 0; }
    ul li { color: #ccc; padding: 0.35rem 0 0.35rem 1.4rem; position: relative; }
    ul li::before { content: "✓"; position: absolute; left: 0; color: #f97316; font-size: 0.85rem; }
    a { color: #f97316; text-decoration: none; }
    a:hover { text-decoration: underline; }
    footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #222; font-size: 0.8rem; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">Spartan Coaching</div>
      <h1>Terms of Service</h1>
      <p class="subtitle">Effective date: January 1, 2025 &nbsp;·&nbsp; Last updated: June 2025</p>
    </header>

    <section>
      <h2>Overview</h2>
      <p>
        Use of the Spartan Coaching app and any coaching engagement is governed by these terms.
        By using the app you agree to them.
      </p>
    </section>

    <section>
      <h2>Permitted Use</h2>
      <ul>
        <li>Content in the app (drills, knowledge base, role-play, articles) is for educational use by hospice sales professionals.</li>
        <li>AI-generated coaching is a tool, not a substitute for your judgment or your compliance officer.</li>
        <li>You agree not to use the app to share PHI, defame third parties, or circumvent rate limits.</li>
      </ul>
    </section>

    <section>
      <h2>Coaching Engagements</h2>
      <p>
        Paid coaching engagements (sessions purchased through the app) are governed by a separate
        written services agreement provided at the time of purchase. These Terms of Service apply
        to your use of the app itself.
      </p>
    </section>

    <section>
      <h2>Intellectual Property</h2>
      <p>
        All content, drills, exercises, and materials in the Spartan Coaching app are the exclusive
        property of Spartan Coaching. You may not reproduce, distribute, or create derivative works
        without prior written permission.
      </p>
    </section>

    <section>
      <h2>Disclaimer of Warranties</h2>
      <p>
        The app is provided &ldquo;as is&rdquo; without warranties of any kind, express or implied.
        Spartan Coaching does not warrant that the service will be uninterrupted, error-free, or
        free of harmful components.
      </p>
    </section>

    <section>
      <h2>Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, Spartan Coaching shall not be liable for any
        indirect, incidental, or consequential damages arising from your use of the app or any
        coaching materials.
      </p>
    </section>

    <section>
      <h2>Changes to These Terms</h2>
      <p>
        We may update these terms with notice provided in the app. Continued use of the app after
        an update constitutes acceptance of the revised terms. The &ldquo;Last updated&rdquo; date
        at the top of this page reflects the most recent revision.
      </p>
    </section>

    <section>
      <h2>Contact</h2>
      <p>
        Spartan Coaching<br />
        Nick Lynch<br />
        <a href="mailto:nick@spartanhospicecoaching.com">nick@spartanhospicecoaching.com</a>
      </p>
    </section>

    <footer>
      &copy; 2025 Spartan Coaching. All rights reserved. &nbsp;·&nbsp;
      <a href="/privacy">Privacy Policy</a>
    </footer>
  </div>
</body>
</html>"""


@app.get("/terms", response_class=HTMLResponse, include_in_schema=False)
async def terms_of_service():
    return HTMLResponse(content=_TERMS_HTML, status_code=200)


# ---------- Database schema ----------
_CREATE_TABLES = [
    """
    CREATE TABLE IF NOT EXISTS contacts (
        id           TEXT PRIMARY KEY,
        name         VARCHAR(120) NOT NULL,
        email        VARCHAR(255) NOT NULL,
        phone        VARCHAR(40),
        company      VARCHAR(160),
        service_interest VARCHAR(120),
        message      TEXT NOT NULL,
        email_sent   BOOLEAN DEFAULT FALSE,
        email_error  TEXT,
        created_at   TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS eligibility_checks (
        id               TEXT PRIMARY KEY,
        diagnosis        VARCHAR(80) NOT NULL,
        verdict          VARCHAR(20) NOT NULL,
        indicators_count INTEGER DEFAULT 0,
        created_at       TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS chat_logs (
        id         TEXT PRIMARY KEY,
        prompt     TEXT,
        response   TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS drill_completions (
        id           TEXT PRIMARY KEY,
        device_id    VARCHAR(255) NOT NULL,
        date_key     VARCHAR(10)  NOT NULL,
        drill_index  INTEGER,
        completed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (device_id, date_key)
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_dc_device ON drill_completions(device_id)",
    "CREATE INDEX IF NOT EXISTS idx_dc_date   ON drill_completions(date_key)",
    """
    CREATE TABLE IF NOT EXISTS payment_transactions (
        id             TEXT PRIMARY KEY,
        session_id     VARCHAR(255) NOT NULL UNIQUE,
        package_id     VARCHAR(100),
        package_name   VARCHAR(200),
        amount_cents   INTEGER,
        amount         NUMERIC(10,2),
        currency       VARCHAR(10),
        customer_name  VARCHAR(120),
        customer_email VARCHAR(255),
        notes          TEXT,
        status         VARCHAR(50)  DEFAULT 'initiated',
        payment_status VARCHAR(50)  DEFAULT 'unpaid',
        email_sent     BOOLEAN      DEFAULT FALSE,
        email_error    TEXT,
        created_at     TIMESTAMPTZ  DEFAULT NOW(),
        updated_at     TIMESTAMPTZ  DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS articles (
        id           TEXT PRIMARY KEY,
        title        TEXT NOT NULL,
        description  TEXT NOT NULL,
        body         TEXT,
        linkedin_url TEXT,
        publish_date DATE NOT NULL,
        featured     BOOLEAN      DEFAULT FALSE,
        sort_order   INTEGER      DEFAULT 0,
        created_at   TIMESTAMPTZ  DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS app_settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS subscriptions (
        device_id              TEXT PRIMARY KEY,
        tier                   TEXT NOT NULL DEFAULT 'trial',
        trial_started_at       TIMESTAMPTZ,
        trial_ends_at          TIMESTAMPTZ,
        stripe_customer_id     TEXT,
        stripe_subscription_id TEXT,
        stripe_status          TEXT,
        customer_email         TEXT,
        created_at             TIMESTAMPTZ DEFAULT NOW(),
        updated_at             TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS team_code TEXT",
    "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS customer_email TEXT",
    """
    CREATE TABLE IF NOT EXISTS team_licenses (
        id                     SERIAL PRIMARY KEY,
        code                   TEXT UNIQUE NOT NULL,
        stripe_customer_id     TEXT,
        stripe_subscription_id TEXT,
        stripe_status          TEXT,
        company_name           TEXT,
        contact_email          TEXT,
        seat_count             INT NOT NULL,
        seats_used             INT DEFAULT 0,
        active                 BOOLEAN DEFAULT TRUE,
        created_at             TIMESTAMPTZ DEFAULT NOW(),
        updated_at             TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_tl_code ON team_licenses(code)",
    # Idempotency: prevent duplicate licenses from Stripe webhook replays
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_tl_sub_id ON team_licenses(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL",
]

_SEED_ARTICLES = [
    ("a-real-reason", "The Real Reason Your Hospice Census Is Stuck", "Most hospice organizations blame their census plateau on market conditions or competition. The truth is almost always internal. This article walks through the three most common internal barriers to census growth and what leadership can do about each one.", "https://www.linkedin.com/pulse/real-reason-your-hospice-census-stuck-nicholas-lynch", "2025-11-12", True),
    ("a-territory-planning", "Territory Planning Is Not Optional", "The reps who consistently hit their numbers all share one thing in common: they plan their territory with precision. This article covers the basics of territory planning that most hospice organizations skip entirely, from account tiering to weekly route optimization.", "https://www.linkedin.com/pulse/territory-planning-not-optional-nicholas-lynch", "2025-10-22", True),
    ("a-stop-cold-call", "Stop Calling It a Cold Call", "The phrase cold call creates the wrong mindset before you even pick up the phone. When you reframe outreach as education and relationship building, everything changes. Here is how to shift your thinking and your results.", "https://www.linkedin.com/pulse/stop-calling-it-cold-call-nicholas-lynch", "2025-11-05", False),
    ("a-discharge-planners", "What Your Discharge Planners Wish You Knew", "After interviewing dozens of discharge planners across the country, the patterns are clear. They do not want another lunch. They do not want another brochure. They want reliability, responsiveness, and someone who makes their job easier. This article breaks down exactly what that looks like.", "https://www.linkedin.com/pulse/what-your-discharge-planners-wish-you-knew-nicholas-lynch", "2025-10-29", False),
    ("a-coaching-convo", "The Coaching Conversation Your Sales Manager Owes You", "If your one on ones consist of 'how are your numbers looking,' you are not being coached. Real coaching means your manager is helping you think differently about your accounts, your conversations, and your process. This article outlines what a productive coaching conversation should include.", "https://www.linkedin.com/pulse/coaching-conversation-your-sales-manager-owes-you-nicholas-lynch", "2025-10-15", False),
    ("a-empathy", "Empathy Is Not a Sales Technique", "Too many sales training programs teach empathy as a tactic. Something you say to get people to trust you. That is manipulation, not empathy. In hospice sales, genuine empathy means understanding what families and clinicians are going through and showing up accordingly. This article explores the difference.", "https://www.linkedin.com/pulse/empathy-not-sales-technique-nicholas-lynch", "2025-10-08", False),
    ("a-five-signs", "Five Signs Your Hospice Sales Team Needs Outside Help", "Not every organization needs a consultant. But there are clear warning signs that internal coaching alone is not enough. High turnover among reps, a census that has flatlined for more than two quarters, and a team that cannot articulate their value proposition are just the start.", "https://www.linkedin.com/pulse/five-signs-your-hospice-sales-team-needs-outside-help-nicholas-lynch", "2025-10-01", False),
    ("a-why-failure", "Why Failure Is a Must: Essential Lessons for Personal Development and Success", "Why failure is needed. Take a few moments and check out the article.", "https://www.linkedin.com/posts/nicholas-lynch-coaching_why-failure-is-needed-take-a-few-moments-activity-7395222645656416256-oIr7", "2025-11-15", True),
]

_SEED_ARTICLE_BODIES: dict[str, str] = {
    "a-real-reason": """\
# The Real Reason Your Hospice Census Is Stuck

When census growth stalls, the first instinct is to look outward. Blame the competition. Blame the referral sources who stopped calling. Blame the market.

I have worked with hospice organizations across the country, and I can tell you with confidence: the market is almost never the primary reason your census is flat. The reason is almost always internal.

Here are the three most common internal barriers I see — and what leadership can actually do about each one.

## 1. Your Sales Team Doesn't Have a Clear Value Proposition

Ask five reps on your team to explain why a referring physician should choose you over your competitor. If you get five different answers, you have a problem.

A census plateau often traces back to a team that cannot clearly articulate why your organization is the right choice. Not in a generic "we provide compassionate care" way, but in a specific, differentiated, evidence-based way. What do you do that others do not? What outcomes can you point to? What makes your clinical team different?

If your reps cannot answer those questions in thirty seconds, neither can your referral sources.

**What to do:** Invest in crafting a unified value proposition with your sales and clinical leadership together. Then drill it. Role-play it. Make it second nature.

## 2. Your Managers Are Tracking Numbers, Not Developing Reps

The most common version of sales management in hospice is this: "How many visits did you make this week? How many referrals did you get?" That is not coaching. That is scorekeeping.

When census is stuck, I almost always find that reps are not getting substantive feedback on their actual conversations. They are not being helped to think differently about their accounts. No one is asking them to replay a difficult referral conversation and break down what happened. No one is helping them build skills.

Numbers track outcomes. Coaching changes outcomes. If your managers only do the former, your census will reflect it.

**What to do:** Require structured field coaching. Ride-alongs with debrief conversations. One-on-ones that ask "what is your strategy for this account?" not just "what happened this week?"

## 3. Your Process Breaks Down After the First Referral

Getting the first referral from a new account is hard. Keeping the referrals coming is a different skill set entirely, and most organizations do not train for it.

I see it constantly: a rep lands a new physician relationship, gets a referral or two, and then the account goes cold. Why? Because no one taught them how to deepen that relationship over time. How to follow up on a patient referral with clinical feedback. How to build a genuine partnership instead of a transactional interaction.

Census growth requires referral accounts that trust you consistently, not just accounts you have contacted once.

**What to do:** Build a structured account management process. Define what consistent follow-up looks like. Train your reps on relationship deepening, not just prospecting.

---

If you are honest about your organization and you see yourself in any of these three patterns, that is actually good news. Internal problems are solvable. Market conditions are not always in your control. Your team, your processes, and your culture are.

The census plateau is a symptom. Look inside for the cause.""",

    "a-territory-planning": """\
# Territory Planning Is Not Optional

There is a pattern I see in every high-performing hospice sales rep I have ever coached: they know their territory cold. They can tell you which accounts are producing, which accounts have potential they have not yet unlocked, and which accounts are not worth their time right now.

Their underperforming peers? They are winging it. They wake up Monday morning and figure out where to go based on whoever called them last or who is closest to their house.

Territory planning is not a nice-to-have. It is the foundation of consistent performance.

## Start With Account Tiering

Not all accounts are equal, and you cannot treat them as if they are. You only have so many hours in a week. Where you spend that time determines your results.

Tier your accounts into three buckets:

**Tier 1 — Active and High Value.** These are accounts that are currently referring and represent significant volume potential. They get your most frequent visits and your deepest relationship investment. Know the names of every key contact. Know their preferences and pain points.

**Tier 2 — Warm but Inconsistent.** These accounts have referred before or have clear potential but are not yet reliable. They need consistent, strategic attention to move to Tier 1. Every visit should have a specific goal.

**Tier 3 — Cold or Low Priority.** You are not abandoning these accounts, but you are not spending the same energy on them as Tier 1 and 2. Periodic check-ins. Informational value only until something changes.

Most reps I work with have never done this exercise. Once they do, they immediately see where they have been wasting time.

## Build a Weekly Routing Structure

Random driving is time you are not selling. Map your accounts geographically and group visits by proximity. Block out your week by area, not by urgency.

This sounds basic. Most reps still do not do it.

A structured routing week might look like:
- Monday: Hospital accounts in the north zone
- Tuesday: Physician offices and SNFs in the east zone
- Wednesday: Relationship-building visits and follow-ups
- Thursday: West zone and home health agency contacts
- Friday: Administrative catch-up and next-week planning

The specifics depend on your territory. The principle is the same: intentional routing eliminates wasted windshield time and keeps you fresh for actual selling conversations.

## Set Account-Level Goals Before Every Visit

Walking into an account without a specific goal is a wasted visit. Before every call, answer these three questions:

1. What is the one outcome I am trying to achieve today?
2. What information do I need to get or give?
3. What does success look like when I walk out the door?

This habit alone will separate you from most of your competition. Referral sources notice when someone is prepared. They can feel when a rep is there with purpose versus just "stopping by."

## Review and Adjust Monthly

Your territory is not static. Accounts change. Contacts move. New practices open. A good planning system includes a monthly review where you reassess your tiers, identify accounts that need more attention, and acknowledge accounts that are not producing so you can make deliberate decisions about them.

---

The reps who hit their numbers year over year are not necessarily the most charismatic or the hardest workers. They are the most organized. They approach their territory like a business — with strategy, intention, and consistent execution.

Territory planning is not glamorous. But it is the difference between grinding and growing.""",

    "a-stop-cold-call": """\
# Stop Calling It a Cold Call

The moment you call something a cold call, you have already lost.

That phrase carries baggage. It implies you are an outsider trying to break in. It suggests the person on the other end does not want to hear from you. It frames the entire interaction as adversarial before you have said a single word.

Change the language. Change the mindset. Change the results.

## What You Are Actually Doing

When a hospice sales representative reaches out to a referring physician, discharge planner, or senior living administrator for the first time, they are not cold calling. They are introducing a resource.

Think about what your organization actually offers: expertise, responsiveness, clinical excellence, and support for some of the most difficult moments a patient and family will ever face. You are not selling a product that someone may or may not need. You are connecting a resource to a professional who almost certainly has patients who need it right now.

That reframe changes everything about how you approach the outreach.

## The Problem With Cold Call Energy

When reps approach new outreach with cold call energy, it shows. Their voice tightens. They rush through their introduction. They are apologetic. They offer an easy out before the contact has even had a chance to engage.

I have listened to hundreds of these conversations. The ones that fail often fail in the first fifteen seconds — not because of a bad pitch, but because of a bad internal state.

Confidence is not about being aggressive. It is about genuinely believing that what you are offering has value. If you believe you are interrupting someone's day to ask for something, you will sound like it. If you believe you are bringing them something that could genuinely help their patients, that comes through too.

## A Simple Reframe That Works

Instead of thinking "I need to get a meeting," think "I want to understand whether my organization can serve the patients this person works with."

That small shift moves you from extraction to inquiry. It changes your questions. It makes you more curious and less pushy. It sounds like this:

*"I know your time is limited, so I just want to ask — when families come to you needing end-of-life guidance, what matters most to you about the hospice organization you refer to?"*

Now you are having a different conversation entirely. You are not pitching. You are learning. And you are positioning yourself as someone who actually cares about fit, not just volume.

## What to Do Before You Reach Out

True warm outreach means doing a little homework first.

- Look at their practice or facility website. What do they specialize in? What is their patient population?
- If they have an active LinkedIn or news presence, read it.
- Talk to colleagues. Has anyone in your organization worked with this account before?
- Think about one or two specific ways your organization's strengths align with what they care about.

You may only have sixty seconds with this person. Make those sixty seconds specific to them, not generic to everyone on your list.

## The Long Game

The hospice sales reps who build the deepest referral relationships are not the ones who called the most. They are the ones who showed up with a point of view, asked good questions, and treated every interaction as the beginning of a professional relationship — not a transaction.

Cold calls are for reps who think in transactions. Referral partnerships are for reps who think in relationships.

Stop calling it a cold call. Start calling it what it is: an introduction.

That change alone might be the most important shift you make this year.""",

    "a-discharge-planners": """\
# What Your Discharge Planners Wish You Knew

Discharge planners are among the most important referral partners a hospice organization can have. They are also among the most burned-out, time-pressured, and frequently misunderstood professionals in the healthcare system.

I have sat down with dozens of them over the years. Not to pitch. To listen. And what they tell me about hospice sales reps is consistent, candid, and — for most organizations — a significant wake-up call.

Here is what they wish you knew.

## "Stop Bringing Lunch and Actually Be Available"

The box of pastries, the catered lunch, the gift card — discharge planners know what these are. Some appreciate the gesture. Most have stopped being influenced by it. They have five other hospice reps bringing food on rotation.

What they cannot find easily is a rep who answers their phone at 4:30 on a Friday afternoon when a patient needs to go home the same day.

Responsiveness is the single most mentioned factor in what makes a hospice rep valuable to a discharge planner. Not gifts. Not personality. Not brochures. Responsiveness.

If you are going to differentiate yourself, do it with availability, not calories.

## "Know What We're Dealing With Before You Walk In"

Discharge planners are often managing fifteen to thirty cases simultaneously. They are fielding family calls, attending care conferences, fighting with insurance companies, and documenting in two different systems.

When a hospice rep walks in without an appointment and wants to chat about their organization's services, that is rarely welcome. When a rep walks in, acknowledges the environment, asks a specific clinical question or shares something directly useful, that is different.

Before you visit a discharge planning department, think about their world. What are the pressures they face? What are the three most common reasons a patient discharge gets complicated? Where does hospice eligibility cause confusion or delay?

Show up knowing something. That is respect.

## "Follow Through on What You Say You'll Do"

This one surprised me at first, but I have heard it so many times it no longer does: the most frustrating thing a hospice rep can do is promise something and not deliver it.

"I'll get you that information by tomorrow." — and then nothing.

"Our clinical team will call the family tonight." — and then it happens two days later.

"Call me anytime." — and then the voicemail box is full.

In a world where patient and family trust is on the line, discharge planners cannot afford to work with hospice partners who do not follow through. Every broken promise creates a story they will tell their colleagues.

Follow through is not a soft skill. In this relationship, it is the whole ballgame.

## "Teach Me Something I Can Use With Families"

The best hospice reps I have heard discharge planners describe are educators. They come in occasionally with a short, genuinely useful piece of clinical information. Something about changes in hospice eligibility criteria. A new pain management approach. An honest answer to a common family objection.

This positions you as a partner and a resource, not just a vendor. It also makes the discharge planner's job slightly easier, which is exactly what earns long-term referral loyalty.

## "Be Honest About What You Can't Do"

Discharge planners have seen hospice organizations overpromise and underdeliver. When they find a rep who honestly says "We are not the best fit for that patient's situation, but here is what I can tell you about who might be" — that kind of integrity is remembered.

It sounds counterintuitive to recommend a competitor. But honesty in a clinically complex environment builds credibility that no sales tactic can manufacture.

---

Your discharge planning partners want to work with someone they can trust, call in a pinch, and respect professionally. That is not a complex ask.

Meet that bar, and you will have referral relationships that last for years.""",

    "a-coaching-convo": """\
# The Coaching Conversation Your Sales Manager Owes You

If every one-on-one you have with your sales manager follows the same pattern — "Here are your numbers. How are you feeling about your pipeline? Okay, keep it up" — you are not being coached.

You are being managed. There is a difference. And it matters enormously for your development and your results.

Here is what a real coaching conversation looks like, and why you deserve to have one.

## The Difference Between Managing and Coaching

Managing is about monitoring outcomes. Coaching is about developing capability.

A manager who monitors outcomes asks: "What were your referrals this week? How does that compare to last week? What is in your pipeline?"

A coach asks: "Tell me about a referral conversation that did not go the way you expected this week. Walk me through what happened. What do you think the physician was actually looking for?"

Outcomes matter. But you cannot change an outcome directly. You can only change the behaviors and thinking that produce outcomes. That is what coaching addresses.

## What a Good Coaching Conversation Includes

A productive coaching conversation covers four things:

**1. A specific situation from the field.** Not a summary of the week. A specific conversation, visit, or account challenge. The more concrete the better. Vague coaching produces vague improvement.

**2. Your manager's genuine curiosity about your thinking.** Not evaluation. Inquiry. "What were you trying to accomplish in that moment?" "What did you read from them when they said that?" "What would you do differently?" Good coaches ask more than they tell.

**3. One or two specific insights or adjustments.** Not a list of ten things you need to fix. One thing you can try differently in the next week. Sustainable development is incremental.

**4. A forward-looking commitment.** What specific thing will you do differently before the next conversation? Without this, coaching stays abstract.

## How to Ask for Better Coaching

If your manager is not giving you this kind of conversation, you can ask for it directly — and professionally.

Before your next one-on-one, bring a specific situation you want to work through. Say something like: "I had a challenging conversation with Dr. Martinez this week and I want to think through it with you. I am not sure I positioned us correctly."

That invitation shifts the format. It gives your manager something concrete to engage with. It moves the conversation from scorekeeping to problem-solving.

Most managers default to the numbers conversation because it is familiar and efficient. When a rep gives them a better entry point, most will take it.

## What You Can Do If Coaching Is Not Available

Not every organization has strong front-line coaches. If yours does not, that is a real problem — but it does not have to stop your development.

Find a peer you respect and commit to regular debrief conversations with each other. Seek out external resources. Ask to ride with a top performer and debrief what you observe. Record your own conversations and listen back critically.

Your development is ultimately your responsibility. A great manager accelerates it. The absence of one does not make it impossible.

## The Commitment Goes Both Ways

If your manager does invest real coaching time with you, show up ready. Bring specific situations. Reflect honestly on your own performance. Be open to feedback that challenges your assumptions.

The coaching conversation is not a performance review. It is a collaborative problem-solving session. It only works if both people are genuinely engaged.

---

You spend significant time and energy on this work. You deserve a manager who helps you get better at it — not just someone who checks whether you are showing up.

If that conversation is not happening, ask for it. You have earned it.""",

    "a-empathy": """\
# Empathy Is Not a Sales Technique

There is a type of sales training that teaches empathy as a tactic.

It sounds like this: "Mirror the customer's emotions back to them." "Use phrases like 'I hear you' and 'That must be difficult.'" "Show that you understand before you ask for the business."

This is not empathy. It is the performance of empathy, deployed in service of a transaction. And in hospice sales, the people across the table from you can tell the difference.

## What Genuine Empathy Actually Is

Genuine empathy is not a communication strategy. It is an orientation.

It means you are genuinely curious about what the person in front of you is experiencing — not because understanding them helps you close them, but because you actually care. Because you recognize that a physician navigating a complicated end-of-life conversation with a family, or a discharge planner trying to get a patient home safely, or a family member who did not expect to be making these decisions so soon — these are real people in real circumstances that matter.

When your empathy is real, your questions are different. Your listening is different. Your silences are different.

When your empathy is performed, people feel it. Maybe not consciously. But somewhere underneath the conversation, they sense that they are being managed, not seen.

## Why This Matters in Hospice

Every other industry can perhaps afford some performance. In hospice, you are operating at the intersection of medicine and death. The clinicians you work with are carrying emotional weight that most salespeople never encounter. The families they serve are in some of the hardest moments of their lives.

If you show up with a script designed to create rapport and trigger referrals, you are not just being ineffective. You are being disrespectful — to the clinicians, to the mission, and to the patients who are ultimately the reason any of this exists.

Real empathy in this space means slowing down enough to understand what a physician actually needs from a hospice partner. It means asking a discharge planner about the cases that keep them up at night and actually listening to the answer. It means recognizing that your role in this ecosystem carries genuine weight.

## The Practical Test

Here is how you know whether your empathy is genuine or tactical: what happens after the call ends?

If the conversation did not produce a referral but you still walk away with a deeper understanding of that account's needs and a genuine desire to help them — that is real empathy at work.

If the only metric you are tracking is whether it moved the needle toward a referral, you were using empathy as a tool.

Both approaches can produce results in the short term. Only one builds the kind of referral relationships that last for years and earn the loyalty of clinicians who take their work as seriously as you should take yours.

## Empathy Requires Exposure

You cannot fake your way to genuine empathy. You have to earn it through exposure and reflection.

Spend time in the clinical environment. Sit with a social worker during a family meeting if your organization will allow it. Read the stories behind the statistics. Understand what a patient in the final weeks of a terminal illness is actually experiencing — not as a talking point, but as a human reality.

When you genuinely understand the stakes of this work, empathy stops being something you practice. It becomes the lens through which you do everything.

---

Hospice is not an industry that tolerates manipulation, even polished, well-intentioned manipulation.

Show up with real empathy, or do not show up at all. The clinicians and families in this space deserve that. And so does the work.""",

    "a-five-signs": """\
# Five Signs Your Hospice Sales Team Needs Outside Help

Let me be direct: not every hospice organization needs an outside sales consultant. Many have strong internal leadership, a clear growth strategy, and the coaching infrastructure to develop their team without outside support.

But some do not. And the organizations that need outside help the most are often the last to recognize it — because recognizing it requires acknowledging that internal leadership has not been sufficient.

Here are five signs that your hospice sales team may need outside perspective.

## 1. Your Census Has Flatlined for Two or More Quarters

A census plateau that lasts one quarter might be seasonal or situational. A census plateau that persists for two or more consecutive quarters despite territory activity is a structural problem.

Internal teams often cannot identify the cause because they are too close to it. They have adapted to the plateau. They have normalized it. An external perspective is not better because it is smarter — it is better because it has not been living inside the problem.

If your leadership team has been discussing the same census challenge for six months without meaningful progress, that is a signal.

## 2. Your Reps Cannot Consistently Articulate Your Value Proposition

Ask your reps individually: "In thirty seconds, why should a physician choose us over the other hospice organizations in this market?"

If you get significantly different answers, you have a problem. It means your team is selling based on individual relationships and improvisation rather than a unified, defensible position in the market.

Outside coaching can help build that value proposition, stress-test it against what referral sources actually care about, and train the team to deliver it consistently.

## 3. You Have High Turnover Among Sales Reps

Hospice sales rep turnover is expensive and disruptive. If you lose multiple reps in a year, the instinct is to focus on hiring. But frequent turnover is almost always a signal about the experience of working in that sales environment.

Common drivers: unclear expectations, inadequate coaching and development, unrealistic quotas, poor relationship between the sales and clinical teams, or a management culture that pressures without supporting.

Outside help can diagnose the root cause — which is rarely what leadership initially assumes it is.

## 4. Your Managers Are Former Top Reps Who Were Promoted Without Coaching Training

This is extremely common in hospice. Your best rep hits their numbers year after year. They get promoted. Now they are a sales manager.

The problem is that being a great rep and being a great coach are fundamentally different skill sets. Great reps succeed on instinct, relationships, and drive. Great coaches succeed on observation, questioning, feedback delivery, and patience.

When organizations promote great reps into management without investing in coaching development, they often end up with managers who produce the numbers conversation instead of the coaching conversation. Outside coaching can fill that gap.

## 5. Your Clinical and Sales Teams Are Not Aligned

Hospice sales does not succeed in isolation. If your referral sources have a great experience with your sales rep but a frustrating experience with your clinical team after the referral, the referral relationship will not last.

Signs of misalignment: reps overpromise what clinical can deliver, clinical does not communicate proactively with referral sources, the sales team has no input into quality improvement conversations, leadership treats sales and clinical as separate silos.

An outside perspective can identify these friction points without the political complications that come with internal leadership pointing fingers across departments.

---

If you recognize your organization in two or more of these signs, it may be time to have an honest conversation about what additional support could look like.

Outside help is not an admission of failure. It is a strategic investment in growth. The organizations that seek outside perspective when they need it are the ones that break through plateaus. The ones that wait until the situation is critical tend to spend far more — in time, turnover, and lost census — than the cost of early intervention.""",

    "a-why-failure": """\
# Why Failure Is a Must: Essential Lessons for Personal Development and Success

We live in a culture that talks about failure in one of two ways.

Either failure is celebrated in a shallow, performative way — "fail fast, fail often" on a motivational poster in a conference room where no one actually fails and keeps their job. Or failure is treated as something to be hidden, minimized, and never spoken about after the quarterly review.

Neither approach is honest. And neither approach produces the growth that comes from genuinely sitting with failure and learning from it.

Here is what I have learned from my own failures, and from working with sales professionals who have experienced both sides.

## Failure Is Information, Not Identity

The most important distinction you can make when you fail at something — a conversation, a goal, a relationship, a year — is between what happened and what it means.

What happened is specific and factual. You did not hit your census goal. You lost a key referral account. A coaching conversation went sideways. These are events.

What it means is the story you tell yourself about those events. And here is where most people go wrong: they take a specific failure and use it to make a global claim about themselves. "I missed my numbers" becomes "I am not cut out for this." "I lost that account" becomes "I am a bad rep."

Failure as information asks: "What specifically happened? What can I learn? What would I do differently?" Failure as identity asks: "What does this say about me?" The first question leads somewhere productive. The second keeps you stuck.

## The Reps Who Grew the Most Had the Most Failures

In ten-plus years of working in and around hospice sales, the highest performers I have known are also among the people who have experienced the most professional failure. That is not a coincidence.

Growth in any skill domain requires operating at the edge of your capability — and operating at the edge of your capability means failing regularly. If you are not failing, you are not stretching. If you are not stretching, you are not growing.

The reps who plateau are often the ones who found a level of comfortable adequacy and stopped pushing past it. They have good relationships. They know their accounts. Their numbers are fine.

And then the market shifts, a major referral source retires, or a competitor enters their territory — and they have nothing to draw on because they stopped developing years ago.

## Failure Requires Honest Processing

Failure is only useful if you process it honestly. This is harder than it sounds.

Most people process failure in one of two dishonest ways: they minimize it ("It wasn't that bad, things like this happen") or they catastrophize it ("This is a disaster and I don't know if I can recover"). Neither produces learning.

Honest processing means sitting with the failure long enough to extract what is actually true about it. It means asking:

- What specifically did I do or not do that contributed to this outcome?
- What was outside my control, and am I being honest about that distinction?
- What would I need to believe or do differently for this not to happen again?
- Who can I talk to who will give me honest feedback rather than just comfort?

That last question is crucial. Real growth from failure often requires another person — a coach, a trusted colleague, a mentor — who will tell you the truth.

## Resilience Is Not Bouncing Back. It Is Moving Through.

There is a popular notion that resilience means bouncing back quickly from failure. Get back on the horse. Shake it off. Get right back to work.

I am skeptical of that framing. Bouncing back without processing means the failure did not change you — which means it did not teach you anything. You just survived it.

Real resilience is moving through the failure. Acknowledging what happened. Feeling whatever you feel about it. Extracting the lessons. And then, from a place of genuine understanding rather than suppressed anxiety, moving forward.

That process takes longer than bouncing back. It also produces a more capable, more grounded version of you on the other side.

---

Failure is not optional in any serious professional life. It is the price of growth.

The question is never whether you will fail. The question is whether you will let it teach you something.""",
}


@app.on_event("startup")
async def startup():
    global pool
    if not DATABASE_URL:
        logger.error("DATABASE_URL is not set — database features will be unavailable")
        return
    try:
        pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)
        async with pool.acquire() as conn:
            for stmt in _CREATE_TABLES:
                await conn.execute(stmt)
            # Migration: add sort_order column to existing databases
            await conn.execute(
                "ALTER TABLE articles ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0"
            )
            for row in _SEED_ARTICLES:
                await conn.execute(
                    """INSERT INTO articles (id, title, description, linkedin_url, publish_date, featured)
                       VALUES ($1, $2, $3, $4, $5, $6)
                       ON CONFLICT (id) DO NOTHING""",
                    row[0], row[1], row[2], row[3], date.fromisoformat(row[4]), row[5],
                )
            for article_id, body in _SEED_ARTICLE_BODIES.items():
                await conn.execute(
                    "UPDATE articles SET body = $1 WHERE id = $2 AND body IS NULL",
                    body, article_id,
                )
            # Seed default hero badge setting
            await conn.execute(
                """INSERT INTO app_settings (key, value)
                   VALUES ('hero_badge', '2026 Coaching Programs Open')
                   ON CONFLICT (key) DO NOTHING"""
            )
            # Initialize sort_order for articles that haven't been ordered yet
            max_order = await conn.fetchval("SELECT MAX(sort_order) FROM articles")
            if max_order is None or max_order == 0:
                await conn.execute(
                    """
                    WITH ranked AS (
                        SELECT id,
                               (ROW_NUMBER() OVER (ORDER BY publish_date DESC, id) - 1) AS rn
                        FROM articles
                    )
                    UPDATE articles SET sort_order = ranked.rn
                    FROM ranked WHERE articles.id = ranked.id
                    """
                )
        logger.info("PostgreSQL pool ready")
    except Exception as exc:
        logger.error("PostgreSQL startup failed: %s", exc)

    resend_status  = "configured" if RESEND_API_KEY else "DISABLED"
    ai_status      = "configured" if OPENAI_API_KEY else "DISABLED"
    stripe_status  = "configured" if STRIPE_API_KEY else "DISABLED"
    admin_status = "beta-unlocked" if BETA_UNLOCK_ENABLED else (
        "configured" if ADMIN_TOKEN and ADMIN_TOKEN != "spartan-admin" else "default"
    )
    logger.info(
        "Spartan API up | DB=%s | AI=%s | Stripe=%s | Resend=%s | Admin=%s",
        "ok" if pool else "UNAVAILABLE",
        ai_status, stripe_status, resend_status,
        admin_status,
    )
    if not BETA_UNLOCK_ENABLED and (not ADMIN_TOKEN or ADMIN_TOKEN == "spartan-admin"):
        logger.error(
            "SECURITY: ADMIN_TOKEN is using the default value. "
            "Set a strong random secret in the ADMIN_TOKEN environment variable before going to production."
        )
    elif BETA_UNLOCK_ENABLED:
        logger.info("Admin routes are beta-unlocked via BETA_UNLOCK_ENABLED=1.")
    if not STRIPE_WEBHOOK_SECRET:
        logger.warning(
            "STRIPE_WEBHOOK_SECRET is not set — Stripe webhook signature verification is DISABLED. "
            "Set this secret in production to prevent webhook spoofing attacks."
        )


@app.on_event("shutdown")
async def shutdown():
    if pool:
        await pool.close()


# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_dict(row) -> dict:
    result = {}
    for k, v in dict(row).items():
        if isinstance(v, datetime):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result


# ---------- Team-code generation ----------
_NATO_WORDS = [
    "ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT", "GOLF",
    "HOTEL", "INDIA", "JULIET", "KILO", "LIMA", "MIKE", "NOVEMBER",
    "OSCAR", "PAPA", "QUEBEC", "ROMEO", "SIERRA", "TANGO", "UNIFORM",
    "VICTOR", "WHISKEY", "XRAY", "YANKEE", "ZULU",
]
_ALPHANUMERIC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # exclude ambiguous chars (0/O, 1/I)


import random as _random


async def _generate_team_code(conn) -> str:
    """Generate a unique SPARTAN-WORD-NC code and verify it is unused in the DB."""
    for _ in range(20):
        word   = _random.choice(_NATO_WORDS)
        digit  = _random.choice("23456789")
        letter = _random.choice("ABCDEFGHJKLMNPQRSTUVWXYZ")
        code   = f"SPARTAN-{word}-{digit}{letter}"
        exists = await conn.fetchval("SELECT 1 FROM team_licenses WHERE code = $1", code)
        if not exists:
            return code
    raise RuntimeError("Could not generate unique team code after 20 attempts")


# Rate limiter — 30 AI requests / 60 s per device (or per IP when device unknown)
_RATE_WINDOW  = 60
_RATE_MAX     = 30
_rate_buckets: dict[str, deque] = defaultdict(deque)


def rate_limit_ai(request: Request, device_id: Optional[str] = None) -> None:
    ip  = request.client.host if request.client else "unknown"
    # Header takes precedence (injected by api.ts interceptor for every call),
    # then fall back to the body field, then to IP.
    header_id = request.headers.get("X-Device-ID")
    resolved  = header_id or device_id
    key = f"device:{resolved}" if resolved else f"ip:{ip}"
    now = _time.time()
    bkt = _rate_buckets[key]
    while bkt and now - bkt[0] > _RATE_WINDOW:
        bkt.popleft()
    if len(bkt) >= _RATE_MAX:
        raise HTTPException(
            status_code=429,
            detail=f"Too many AI requests — limit is {_RATE_MAX}/min. Try again shortly.",
        )
    bkt.append(now)


async def check_subscription(request: Request, device_id_body: Optional[str] = None) -> None:
    """Gate AI features behind subscription. Raises 402 if trial expired and not subscribed."""
    header_id = request.headers.get("X-Device-ID")
    device_id = (header_id or device_id_body or "").strip()

    if not device_id:
        # Fail closed — no anonymous access to paid AI features
        raise HTTPException(status_code=401, detail="Device identification required.")

    if not pool:
        return  # No DB — allow (dev / cold start)

    now = datetime.now(timezone.utc)
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT tier, trial_ends_at, stripe_status, team_code FROM subscriptions WHERE device_id = $1",
            device_id,
        )
        if not row:
            # First AI use — start 24-hour free trial automatically
            trial_end = now + timedelta(hours=24)
            await conn.execute(
                """INSERT INTO subscriptions (device_id, tier, trial_started_at, trial_ends_at)
                   VALUES ($1, 'trial', $2, $3)
                   ON CONFLICT (device_id) DO NOTHING""",
                device_id, now, trial_end,
            )
            return  # In trial

        tier          = row["tier"]
        stripe_status = row["stripe_status"]
        trial_ends_at = row["trial_ends_at"]
        team_code     = row["team_code"]

        # Active paying subscriber (includes Stripe trial period)
        if stripe_status in ("active", "trialing"):
            return

        # Team license — validate the license row is still active
        if tier == "team" and team_code:
            tl = await conn.fetchrow(
                "SELECT active, stripe_status FROM team_licenses WHERE code = $1",
                team_code,
            )
            if tl and tl["active"] and tl["stripe_status"] in ("active", "trialing"):
                return
            # License revoked or payment lapsed — fall through to 402

    # Trial still valid
    if trial_ends_at and trial_ends_at > now:
        return

    # Trial expired, no active subscription
    raise HTTPException(
        status_code=402,
        detail={"error": "subscription_required", "trial_expired": True},
    )


async def llm_complete(
    system: str,
    user_text: str,
    model: str = LLM_MODEL_FAST,
    history: Optional[List[dict]] = None,
) -> str:
    if not openai_client:
        raise HTTPException(status_code=503, detail="AI is not configured. Set OPENAI_API_KEY.")

    messages: list = [{"role": "system", "content": system}]
    if history:
        for msg in history[-12:]:
            role    = msg.get("role", "user")
            content = (msg.get("content") or "").strip()
            if content:
                messages.append({
                    "role": "assistant" if role == "model" else "user",
                    "content": content,
                })
    messages.append({"role": "user", "content": user_text})

    async def _attempt(use_model: str) -> str:
        resp = await openai_client.chat.completions.create(
            model=use_model,
            messages=messages,
            max_tokens=2000,
        )
        return resp.choices[0].message.content or ""

    try:
        return await _attempt(model)
    except Exception as exc:
        msg = str(exc).lower()
        if model != LLM_MODEL_FAST and any(k in msg for k in ("budget", "rate", "quota", "429")):
            logger.warning("Falling back %s → %s: %s", model, LLM_MODEL_FAST, exc)
            return await _attempt(LLM_MODEL_FAST)
        raise


# ---------- Pydantic models ----------
class HealthResponse(BaseModel):
    status: str
    timestamp: str


class ChatHistoryItem(BaseModel):
    role: Literal["user", "model"]
    content: str


class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    conversationHistory: List[ChatHistoryItem] = Field(default_factory=list)
    deviceId: Optional[str] = Field(default=None, max_length=255)


class ChatResponse(BaseModel):
    response: str


class AskRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)
    deviceId: Optional[str] = Field(default=None, max_length=255)


class ObjectionRequest(BaseModel):
    objection: str = Field(..., min_length=3, max_length=1000)
    context: Optional[str] = Field(default=None, max_length=1000)
    deviceId: Optional[str] = Field(default=None, max_length=255)


class PlaybookRequest(BaseModel):
    scenario: str = Field(..., min_length=10, max_length=2000)
    referralSourceType: Optional[str] = None
    goal: Optional[str] = None
    deviceId: Optional[str] = Field(default=None, max_length=255)


class RoleplayMessage(BaseModel):
    role: Literal["user", "model"]
    content: str


class RoleplayRequest(BaseModel):
    scenarioId: str
    userMessage: str = Field(..., min_length=1, max_length=2000)
    history: List[RoleplayMessage] = Field(default_factory=list)
    deviceId: Optional[str] = Field(default=None, max_length=255)


class RoleplayFeedbackRequest(BaseModel):
    scenarioId: str
    transcript: List[RoleplayMessage]


class RoleplayFeedbackResponse(BaseModel):
    feedback: str
    rating: int


class DrillCompleteRequest(BaseModel):
    deviceId: str
    drillIndex: int
    dateKey: str


class ContactRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=40)
    company: Optional[str] = Field(default=None, max_length=160)
    serviceInterest: Optional[str] = Field(default=None, max_length=120)
    message: str = Field(..., min_length=5, max_length=4000)


class EligibilityRequest(BaseModel):
    diagnosis: str = Field(..., min_length=2, max_length=80)
    age: Optional[int] = Field(default=None, ge=0, le=130)
    indicators: List[str] = Field(default_factory=list)
    functionalScore: Optional[str] = Field(default=None, max_length=20)
    functionalScale: Optional[str] = Field(default=None, max_length=20)
    recentEvents: Optional[str] = Field(default=None, max_length=800)
    notes: Optional[str] = Field(default=None, max_length=800)
    deviceId: Optional[str] = Field(default=None, max_length=255)


class CheckoutRequest(BaseModel):
    package_id: str
    origin_url: str
    customer_name: Optional[str] = Field(default=None, max_length=120)
    customer_email: Optional[EmailStr] = None
    notes: Optional[str] = Field(default=None, max_length=600)


# ---------- Health ----------
@api.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", timestamp=now_iso())


@api.get("/")
async def root():
    return {"service": "Spartan Coaching API", "status": "ok"}


# ---------- AI: Chat ----------
@api.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest, request: Request):
    rate_limit_ai(request, req.deviceId)
    await check_subscription(request, req.deviceId)
    history = [m.model_dump() for m in req.conversationHistory]
    try:
        text = await llm_complete(SPARTAN_SYSTEM_INSTRUCTION, req.prompt, model=LLM_MODEL, history=history)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("chat failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    if pool:
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    "INSERT INTO chat_logs (id, prompt, response) VALUES ($1, $2, $3)",
                    str(uuid.uuid4()), req.prompt[:500], text[:500],
                )
        except Exception as exc:
            logger.warning("chat_logs insert failed (non-fatal): %s", exc)
    return ChatResponse(response=text)


@api.post("/ask", response_model=ChatResponse)
async def ask_endpoint(req: AskRequest, request: Request):
    rate_limit_ai(request, req.deviceId)
    await check_subscription(request, req.deviceId)
    prompt = (
        f"A hospice growth professional asks: {req.question}\n\n"
        "Give a clear, concrete, field-ready answer (300-500 words). Use bullets or numbered steps where they help."
    )
    try:
        text = await llm_complete(SPARTAN_SYSTEM_INSTRUCTION, prompt, model=LLM_MODEL_FAST)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("ask failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    return ChatResponse(response=text)


# ---------- AI: Objection Handler ----------
@api.post("/tools/objection", response_model=ChatResponse)
async def objection_endpoint(req: ObjectionRequest, request: Request):
    rate_limit_ai(request, req.deviceId)
    await check_subscription(request, req.deviceId)
    prompt = (
        f'OBJECTION HEARD: "{req.objection}"\n\n'
        f'{"CONTEXT: " + req.context + chr(10) + chr(10) if req.context else ""}'
        "Provide three patient-centered, ethical responses a hospice liaison can use in the next 24 hours:\n"
        "1. A clinical/evidence-based response\n"
        "2. An empathetic/relational response\n"
        "3. A practical/next-step response\n\n"
        "For each, give the exact words to say (2-4 sentences), then a one-line coaching note on why it works."
    )
    try:
        text = await llm_complete(SPARTAN_SYSTEM_INSTRUCTION, prompt, model=LLM_MODEL_FAST)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("objection failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    return ChatResponse(response=text)


# ---------- AI: Playbook Generator ----------
@api.post("/tools/playbook", response_model=ChatResponse)
async def playbook_endpoint(req: PlaybookRequest, request: Request):
    rate_limit_ai(request, req.deviceId)
    await check_subscription(request, req.deviceId)
    prompt = (
        f"SCENARIO: {req.scenario}\n"
        f"REFERRAL SOURCE TYPE: {req.referralSourceType or 'Unspecified'}\n"
        f"GOAL FOR THIS VISIT: {req.goal or 'Unspecified'}\n\n"
        "Build a complete pre-visit sales playbook using The Healthcare Sales Mastery Model "
        "(Discovery, Connecting, Guiding, Commitment).\n\n"
        "Structure your response with these markdown sections:\n"
        "## Pre-visit prep (5 bullet checklist)\n"
        "## Opening (exact words, under 90 seconds)\n"
        "## Discovery questions (5 questions tailored to this referral source)\n"
        "## Likely objections + responses (3 most likely, each with response)\n"
        "## Value proposition (the one clinical-outcome reason they should care)\n"
        "## Close / next step (a specific, low-friction ask)\n"
        "## Follow-up plan (next 14 days)\n"
        "## Compliance reminder (one line, specific to this scenario)"
    )
    try:
        text = await llm_complete(SPARTAN_SYSTEM_INSTRUCTION, prompt, model=LLM_MODEL)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("playbook failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    return ChatResponse(response=text)


# ---------- AI: Roleplay ----------
@api.get("/roleplay/scenarios")
async def roleplay_scenarios():
    return {
        "scenarios": [
            {"id": sid, "title": data["title"], "description": data["description"]}
            for sid, data in ROLEPLAY_CHARACTERS.items()
        ]
    }


@api.post("/roleplay/turn", response_model=ChatResponse)
async def roleplay_turn(req: RoleplayRequest, request: Request):
    rate_limit_ai(request, req.deviceId)
    await check_subscription(request, req.deviceId)
    scenario = ROLEPLAY_CHARACTERS.get(req.scenarioId)
    if not scenario:
        raise HTTPException(status_code=404, detail="Unknown scenario")
    system = (
        scenario["character"]
        + "\n\nIMPORTANT RULES:\n"
        "- Stay completely in character. Never break character or offer coaching tips during the conversation.\n"
        "- Respond as this person would, with their concerns, questions, objections, and communication style.\n"
        "- Keep responses conversational and realistic (2 to 4 sentences typically).\n"
        "- React to what the sales rep says. If they say something good, warm up slightly. If they are too pushy, push back harder.\n"
        "- Do not make it too easy. Real prospects have real concerns and are not easily convinced.\n"
        "- Never mention that you are an AI or that this is a practice exercise."
    )
    history = [m.model_dump() for m in req.history]
    try:
        text = await llm_complete(system, req.userMessage, model=LLM_MODEL_FAST, history=history)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("roleplay failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    return ChatResponse(response=text)


@api.post("/roleplay/feedback", response_model=RoleplayFeedbackResponse)
async def roleplay_feedback(req: RoleplayFeedbackRequest, request: Request):
    await check_subscription(request, getattr(req, 'deviceId', None))
    scenario = ROLEPLAY_CHARACTERS.get(req.scenarioId)
    if not scenario:
        raise HTTPException(status_code=404, detail="Unknown scenario")
    transcript_text = "\n\n".join(
        f"{'Sales Rep' if m.role == 'user' else 'Prospect/Contact'}: {m.content}"
        for m in req.transcript
    )
    prompt = ROLEPLAY_FEEDBACK_PROMPT_TEMPLATE.format(
        scenario_title=scenario["title"], conversation_text=transcript_text
    )
    system = (
        "You are an expert hospice sales coach providing detailed, constructive feedback on practice "
        "role-play sessions. Be specific, reference actual quotes, and provide actionable advice based "
        "on the Spartan Method (Discipline, Empathy, Strategy). Be encouraging but honest."
    )
    try:
        text = await llm_complete(system, prompt, model=LLM_MODEL)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("roleplay feedback failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    m = _re.search(r"RATING:\s*(\d+)", text, _re.IGNORECASE)
    rating   = max(1, min(10, int(m.group(1)))) if m else 5
    feedback = _re.sub(r"RATING:\s*\d+\n?", "", text, flags=_re.IGNORECASE).strip()
    return RoleplayFeedbackResponse(feedback=feedback, rating=rating)


# ---------- Drills ----------
@api.get("/drills/all")
async def get_all_drills():
    return {"drills": [{"index": i, **d} for i, d in enumerate(ALL_DRILLS)]}


@api.get("/drills/today")
async def get_today_drill():
    today      = datetime.now(timezone.utc).date()
    day_of_year = (today - datetime(today.year, 1, 1, tzinfo=timezone.utc).date()).days
    idx = day_of_year % len(ALL_DRILLS)
    d   = ALL_DRILLS[idx]
    return {"index": idx, "category": d["category"], "drill": d["drill"], "dateKey": today.isoformat()}


@api.post("/drills/complete")
async def complete_drill(req: DrillCompleteRequest):
    if not pool:
        raise HTTPException(status_code=503, detail="Database unavailable")
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO drill_completions (id, device_id, date_key, drill_index, completed_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (device_id, date_key) DO UPDATE
                SET drill_index = EXCLUDED.drill_index, completed_at = NOW()
            """,
            str(uuid.uuid4()), req.deviceId, req.dateKey, req.drillIndex,
        )
    return await drill_stats(req.deviceId)


@api.get("/drills/stats/{device_id}")
async def drill_stats(device_id: str):
    if not pool:
        return {"totalCompleted": 0, "streak": 0, "completions": [], "heatmap": []}
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT date_key, drill_index FROM drill_completions WHERE device_id = $1 ORDER BY date_key DESC",
            device_id,
        )
    completions = [{"dateKey": r["date_key"], "drillIndex": r["drill_index"]} for r in rows]
    today = datetime.now(timezone.utc).date()
    done_dates = {datetime.strptime(c["dateKey"], "%Y-%m-%d").date() for c in completions}
    streak = 0
    cur = today if today in done_dates else today - timedelta(days=1)
    while cur in done_dates:
        streak += 1
        cur -= timedelta(days=1)
    heatmap = [
        {"date": (today - timedelta(days=i)).isoformat(), "done": (today - timedelta(days=i)) in done_dates}
        for i in range(89, -1, -1)
    ]
    return {"totalCompleted": len(completions), "streak": streak, "completions": completions[:30], "heatmap": heatmap}


# ---------- Knowledge Base ----------
@api.get("/knowledge")
async def knowledge_base(q: Optional[str] = None, category: Optional[str] = None):
    entries = KNOWLEDGE_BASE_ENTRIES
    if category and category.lower() != "all":
        entries = [e for e in entries if e["category"].lower() == category.lower()]
    if q:
        ql = q.lower()
        entries = [e for e in entries if ql in e["term"].lower() or ql in e["definition"].lower() or ql in e["category"].lower()]
    categories = sorted({e["category"] for e in KNOWLEDGE_BASE_ENTRIES})
    return {"entries": entries, "categories": categories, "total": len(entries)}


# ---------- Contact ----------
@api.post("/contact")
async def contact(req: ContactRequest):
    record_id  = str(uuid.uuid4())
    email_sent = False
    email_error: Optional[str] = None

    if RESEND_API_KEY:
        try:
            html = f"""
<h2>New Spartan Coaching Inquiry</h2>
<p><strong>Name:</strong> {req.name}</p>
<p><strong>Email:</strong> {req.email}</p>
<p><strong>Phone:</strong> {req.phone or '-'}</p>
<p><strong>Company:</strong> {req.company or '-'}</p>
<p><strong>Service Interest:</strong> {req.serviceInterest or '-'}</p>
<hr/>
<p><strong>Message:</strong></p>
<p style="white-space: pre-wrap;">{req.message}</p>
<hr/>
<p style="color:#888;font-size:12px;">Sent from the Spartan Coaching iOS app.</p>
"""
            resend.Emails.send({
                "from": f"{RESEND_FROM_NAME} <{RESEND_FROM_EMAIL}>",
                "to": [CONTACT_EMAIL],
                "reply_to": req.email,
                "subject": f"New inquiry from {req.name} via Spartan Coaching app",
                "html": html,
            })
            email_sent = True
        except Exception as exc:
            logger.exception("resend failed")
            email_error = str(exc)

    if pool:
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO contacts (id, name, email, phone, company, service_interest, message, email_sent, email_error)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    """,
                    record_id, req.name, str(req.email), req.phone, req.company,
                    req.serviceInterest, req.message, email_sent, email_error,
                )
        except Exception as exc:
            logger.exception("contact db insert failed: %s", exc)

    return {"id": record_id, "email_sent": email_sent}


# ---------- Method content (static) ----------
@api.get("/method")
async def method_content():
    return {
        "pillars": [
            {"id": "discipline", "title": "Discipline", "description": "Structure and consistency. Show up prepared, execute with precision, track what matters."},
            {"id": "empathy",    "title": "Empathy",    "description": "Human connection. Listen with intent, understand unspoken needs, build trust beyond a single referral."},
            {"id": "strategy",   "title": "Strategy",   "description": "Act with purpose. Use data, market insights, and proven tools to focus where impact is highest."},
        ],
        "subjects": [
            {"id": "discovery",   "title": "Discovery",   "icon": "compass", "color": "#3b82f6", "purpose": "Discovery is learning about the contact and their individual needs.", "executionStandard": "Ask targeted questions about workflow, decision-making, and patient transition concerns. Listen for the specific language the contact uses.", "measurableOutput": "A completed contact profile capturing stated needs, preferred communication style, decision-making role, and confidence triggers."},
            {"id": "connecting",  "title": "Connecting",  "icon": "users",   "color": "#a855f7", "purpose": "Connecting happens after Discovery. Align to how the contact wants to work, communicate, and move decisions forward.", "executionStandard": "Reference what they shared. Adapt your cadence, format, and content. Confirm mutual understanding of how you will work together.", "measurableOutput": "A documented working agreement reflecting preferred communication method, frequency, and team support."},
            {"id": "guiding",     "title": "Guiding",     "icon": "target",  "color": "#f97316", "purpose": "Use hospice solutions to solve and improve the needs of the contact and account.", "executionStandard": "Present specific capabilities that address identified needs and friction points. Use real examples and clinical support tools.", "measurableOutput": "The contact can articulate at least one specific way your team solves a problem they identified."},
            {"id": "commitment",  "title": "Commitment",  "icon": "check",   "color": "#16a34a", "purpose": "Commit to a patient referral. Make the next step clear action.", "executionStandard": "Define the referral trigger clearly. Establish who calls, when, how, and what happens once received.", "measurableOutput": "A referral pathway document or verbal commitment naming trigger, caller, method, and follow-up process."},
        ],
        "fundamentals": [
            {"title": "Mamba mentality in practice and performance",            "description": "Repetitions on purpose, film review, and one tiny edge after every session."},
            {"title": "Plain language that busy clinical leaders can use the same day", "description": "No jargon. Every word earns its place."},
            {"title": "Minimum necessary data with named users only",            "description": "Track what matters, discard the noise."},
            {"title": "Shared definitions and formulas, so numbers cannot be gamed", "description": "Transparent metrics eliminate ambiguity."},
            {"title": "Visible work that another person can see, repeat, and coach", "description": "If it cannot be observed, it cannot be improved."},
        ],
        "ethics": [
            {"title": "Patient choice is honored at every step",          "icon": "heart"},
            {"title": "Clinical judgment is supported and never replaced", "icon": "shield"},
            {"title": "Privacy is protected by behavior and explained in human language", "icon": "eye"},
            {"title": "Only the minimum necessary data is used",           "icon": "database"},
            {"title": "Only named users have access",                      "icon": "user-check"},
            {"title": "No protected information leaves approved systems",  "icon": "lock"},
        ],
    }


# ---------- Eligibility Quick Check ----------
ELIGIBILITY_SYSTEM = """You are a hospice eligibility clinical reviewer with deep expertise in Medicare Hospice Benefit Local Coverage Determinations (LCDs). You translate a quick clinical snapshot into a hospice-readiness assessment that a non-clinical referral source (SNF DON, hospital case manager, family member) can share with a hospice provider for clinical review.

CRITICAL RULES:
1. You do NOT make a final eligibility determination. Only a hospice medical director can do that. You only flag whether the picture is consistent with hospice criteria and what clinical confirmation would be needed.
2. Always cite which LCD criteria are relevant for the stated diagnosis (e.g., FAST 7A for dementia; NYHA Class IV + EF <20% for CHF; pO2 <55 on room air for COPD; etc.).
3. Be honest. If the picture is weak, say so plainly. Do not encourage premature referral.
4. NEVER include patient identifiers. The user is working with a generic clinical sketch.
5. Output should be practical and shareable: a hospice intake nurse should be able to read it in 60 seconds and know what to ask next."""

ELIGIBILITY_PROMPT_TEMPLATE = """Generate a hospice-readiness summary based on this clinical snapshot. Use the exact section headings shown.

## Snapshot
- Primary diagnosis: {diagnosis}
- Approximate age: {age}
- Functional scale: {functional_scale} = {functional_score}
- Documented decline indicators: {indicators}
- Recent events: {recent_events}
- Additional notes: {notes}

## Required output structure

## Readiness Verdict
One of exactly these three labels followed by a single-sentence rationale:
- "LIKELY ELIGIBLE — picture aligns with Medicare LCD criteria; recommend formal evaluation."
- "POSSIBLE — some indicators present; clinical confirmation needed."
- "NOT YET — insufficient decline indicators for hospice eligibility at this time."

Start this section with a line "VERDICT: <one of LIKELY|POSSIBLE|NOT_YET>" then the human sentence.

## LCD Alignment
The 2-3 most relevant LCD criteria for {diagnosis} and how the snapshot maps (or fails to map) to each. Be specific with numbers and scales.

## What to Confirm Clinically
A short checklist (3-5 bullets) of the specific labs, scales, or documentation a hospice intake nurse should request from the referring clinician to confirm eligibility.

## Suggested Next Step
One concrete action the referral source can take in the next 24 hours.

## Important Reminder
A single sentence reminding the reader that final eligibility determination requires physician certification per Medicare guidelines and that this summary is an education tool only."""


@api.post("/eligibility/assess")
async def eligibility_assess(req: EligibilityRequest, request: Request):
    rate_limit_ai(request, req.deviceId)
    await check_subscription(request, req.deviceId)
    indicators_text = ", ".join(req.indicators) if req.indicators else "none reported"
    prompt = ELIGIBILITY_PROMPT_TEMPLATE.format(
        diagnosis=req.diagnosis,
        age=req.age if req.age else "not specified",
        functional_scale=req.functionalScale or "not specified",
        functional_score=req.functionalScore or "not specified",
        indicators=indicators_text,
        recent_events=req.recentEvents or "none specified",
        notes=req.notes or "none",
    )
    try:
        text = await llm_complete(ELIGIBILITY_SYSTEM, prompt, model=LLM_MODEL_FAST)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("eligibility failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    m = _re.search(r"VERDICT:\s*(LIKELY|POSSIBLE|NOT_YET)", text, _re.IGNORECASE)
    verdict = m.group(1).upper() if m else "POSSIBLE"
    summary = _re.sub(r"VERDICT:\s*(LIKELY|POSSIBLE|NOT_YET)\s*\n?", "", text, flags=_re.IGNORECASE).strip()
    if pool:
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    "INSERT INTO eligibility_checks (id, diagnosis, verdict, indicators_count) VALUES ($1, $2, $3, $4)",
                    str(uuid.uuid4()), req.diagnosis, verdict, len(req.indicators),
                )
        except Exception as exc:
            logger.warning("eligibility_checks insert failed (non-fatal): %s", exc)
    return {"verdict": verdict, "summary": summary}


# ---------- Admin ----------
def require_admin(authorization: Optional[str] = Header(default=None)):
    if BETA_UNLOCK_ENABLED:
        return True
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing admin token")
    token = authorization.split(" ", 1)[1].strip()
    if token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid admin token")
    return True


@api.get("/admin/overview")
async def admin_overview(_: bool = Depends(require_admin)):
    if not pool:
        raise HTTPException(status_code=503, detail="Database unavailable")
    async with pool.acquire() as conn:
        contacts_total  = await conn.fetchval("SELECT COUNT(*) FROM contacts")
        contacts_today  = await conn.fetchval("SELECT COUNT(*) FROM contacts WHERE created_at >= NOW() - INTERVAL '1 day'")
        contacts_week   = await conn.fetchval("SELECT COUNT(*) FROM contacts WHERE created_at >= NOW() - INTERVAL '7 days'")
        contacts_month  = await conn.fetchval("SELECT COUNT(*) FROM contacts WHERE created_at >= NOW() - INTERVAL '30 days'")

        elig_total = await conn.fetchval("SELECT COUNT(*) FROM eligibility_checks")
        elig_week  = await conn.fetchval("SELECT COUNT(*) FROM eligibility_checks WHERE created_at >= NOW() - INTERVAL '7 days'")

        verdict_rows = await conn.fetch(
            "SELECT verdict, COUNT(*) AS cnt FROM eligibility_checks WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY verdict"
        )
        verdict_breakdown = {r["verdict"]: r["cnt"] for r in verdict_rows}

        top_diag_rows = await conn.fetch(
            "SELECT diagnosis, COUNT(*) AS cnt FROM eligibility_checks WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY diagnosis ORDER BY cnt DESC LIMIT 8"
        )
        top_diagnoses = [{"diagnosis": r["diagnosis"], "count": r["cnt"]} for r in top_diag_rows]

        drills_total     = await conn.fetchval("SELECT COUNT(*) FROM drill_completions")
        unique_drillers  = await conn.fetchval("SELECT COUNT(DISTINCT device_id) FROM drill_completions")

        chat_total = await conn.fetchval("SELECT COUNT(*) FROM chat_logs")
        chat_week  = await conn.fetchval("SELECT COUNT(*) FROM chat_logs WHERE created_at >= NOW() - INTERVAL '7 days'")

    return {
        "generated_at": now_iso(),
        "contacts": {"total": contacts_total, "today": contacts_today, "last_7_days": contacts_week, "last_30_days": contacts_month},
        "eligibility_checks": {"total": elig_total, "last_7_days": elig_week, "verdict_breakdown_30d": verdict_breakdown, "top_diagnoses_30d": top_diagnoses},
        "drills": {"total_completions": drills_total, "unique_users": unique_drillers},
        "ai_chat": {"total": chat_total, "last_7_days": chat_week},
    }


@api.get("/admin/contacts")
async def admin_contacts(_: bool = Depends(require_admin), limit: int = 50):
    if not pool:
        raise HTTPException(status_code=503, detail="Database unavailable")
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM contacts ORDER BY created_at DESC LIMIT $1", limit)
    items = [_row_to_dict(r) for r in rows]
    return {"items": items, "count": len(items)}


@api.get("/admin/eligibility")
async def admin_eligibility(_: bool = Depends(require_admin), limit: int = 100):
    if not pool:
        raise HTTPException(status_code=503, detail="Database unavailable")
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM eligibility_checks ORDER BY created_at DESC LIMIT $1", limit)
    items = [_row_to_dict(r) for r in rows]
    return {"items": items, "count": len(items)}


class ArticlePayload(BaseModel):
    title: str
    description: str
    body: Optional[str] = None
    linkedinUrl: Optional[str] = None
    publishDate: str
    featured: bool = False


@api.post("/admin/articles", status_code=201)
async def admin_create_article(payload: ArticlePayload, _: bool = Depends(require_admin)):
    if not pool:
        raise HTTPException(status_code=503, detail="Database unavailable")
    slug = _re.sub(r"[^a-z0-9]+", "-", payload.title.lower()).strip("-")[:50]
    article_id = "a-" + slug
    async with pool.acquire() as conn:
        existing = await conn.fetchval("SELECT id FROM articles WHERE id = $1", article_id)
        if existing:
            raise HTTPException(status_code=409, detail=f"Article id '{article_id}' already exists — use PUT to update")
        max_order = await conn.fetchval("SELECT COALESCE(MAX(sort_order), -1) FROM articles")
        new_order = max_order + 1
        await conn.execute(
            """INSERT INTO articles (id, title, description, body, linkedin_url, publish_date, featured, sort_order)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
            article_id, payload.title, payload.description, payload.body,
            payload.linkedinUrl, date.fromisoformat(payload.publishDate), payload.featured,
            new_order,
        )
    return {"id": article_id, "status": "created"}


class ArticleOrderItem(BaseModel):
    id: str
    sortOrder: int


class ArticleReorderPayload(BaseModel):
    order: List[ArticleOrderItem]


@api.patch("/admin/articles/reorder")
async def admin_reorder_articles(payload: ArticleReorderPayload, _: bool = Depends(require_admin)):
    if not pool:
        raise HTTPException(status_code=503, detail="Database unavailable")
    async with pool.acquire() as conn:
        for item in payload.order:
            await conn.execute(
                "UPDATE articles SET sort_order = $1 WHERE id = $2",
                item.sortOrder, item.id,
            )
    return {"status": "reordered"}


@api.put("/admin/articles/{article_id}")
async def admin_update_article(article_id: str, payload: ArticlePayload, _: bool = Depends(require_admin)):
    if not pool:
        raise HTTPException(status_code=503, detail="Database unavailable")
    async with pool.acquire() as conn:
        result = await conn.execute(
            """UPDATE articles
               SET title=$1, description=$2, body=$3, linkedin_url=$4,
                   publish_date=$5, featured=$6
               WHERE id=$7""",
            payload.title, payload.description, payload.body,
            payload.linkedinUrl, date.fromisoformat(payload.publishDate), payload.featured,
            article_id,
        )
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Article not found")
    return {"id": article_id, "status": "updated"}


@api.delete("/admin/articles/{article_id}", status_code=200)
async def admin_delete_article(article_id: str, _: bool = Depends(require_admin)):
    if not pool:
        raise HTTPException(status_code=503, detail="Database unavailable")
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM articles WHERE id = $1", article_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Article not found")
    return {"id": article_id, "status": "deleted"}


# ---------- App Settings ----------

class HeroBadgeUpdate(BaseModel):
    text: str

@app.get("/api/settings/hero")
async def get_hero_badge():
    """Public endpoint — returns the hero badge text shown on the home screen."""
    if pool is None:
        return {"text": "2026 Coaching Programs Open"}
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT value FROM app_settings WHERE key = 'hero_badge'")
    return {"text": row["value"] if row else "2026 Coaching Programs Open"}

@app.put("/api/admin/settings/hero")
async def admin_update_hero_badge(payload: HeroBadgeUpdate, _: bool = Depends(require_admin)):
    if not payload.text.strip():
        raise HTTPException(status_code=422, detail="Badge text cannot be empty.")
    if pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    text = payload.text.strip()[:120]
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO app_settings (key, value, updated_at)
               VALUES ('hero_badge', $1, NOW())
               ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()""",
            text,
        )
    return {"status": "updated", "text": text}


# ---------- Billing / Stripe ----------
COACHING_PACKAGES = {
    "coaching_30": {"name": "Virtual Coaching Session — 30 minutes", "amount": 40.00, "currency": "usd", "duration_min": 30},
    "coaching_60": {"name": "Virtual Coaching Session — 60 minutes", "amount": 70.00, "currency": "usd", "duration_min": 60},
}


def _send_purchase_email(record: dict) -> Optional[str]:
    if not RESEND_API_KEY:
        return "resend not configured"
    try:
        pkg_name   = record.get("package_name") or "Coaching Session"
        amount     = record.get("amount") or 0
        currency   = (record.get("currency") or "usd").upper()
        cust_name  = record.get("customer_name") or "(not provided)"
        cust_email = record.get("customer_email") or ""
        cust_email_display = cust_email or "(not provided)"
        notes      = record.get("notes") or "(none)"
        sess       = record.get("session_id", "")

        # --- Admin notification (to Nick) ---
        admin_html = f"""
<h2>New Coaching Session Booked & Paid</h2>
<p><strong>Package:</strong> {pkg_name}</p>
<p><strong>Amount paid:</strong> ${amount:.2f} {currency}</p>
<hr/>
<p><strong>Customer name:</strong> {cust_name}</p>
<p><strong>Customer email:</strong> {cust_email_display}</p>
<p><strong>Notes / prep:</strong></p>
<p style="white-space: pre-wrap;">{notes}</p>
<hr/>
<p style="color:#888;font-size:12px;">Stripe session: {sess}<br/>Reply to this email to coordinate scheduling.</p>
"""
        admin_kwargs: dict = {
            "from": f"{RESEND_FROM_NAME} <{RESEND_FROM_EMAIL}>",
            "to": [CONTACT_EMAIL],
            "subject": f"New paid coaching booking — {pkg_name}",
            "html": admin_html,
        }
        if cust_email and "@" in cust_email:
            admin_kwargs["reply_to"] = cust_email
        resend.Emails.send(admin_kwargs)

        # --- Customer confirmation (to buyer) ---
        if cust_email and "@" in cust_email:
            customer_html = f"""
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0a0a0b;color:#e5e5e5;padding:40px 24px;max-width:600px;margin:0 auto;">
  <p style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#ef4444;margin:0 0 16px;">Spartan Coaching</p>
  <h1 style="font-size:28px;font-weight:800;color:#fff;margin:0 0 8px;">You&rsquo;re booked.</h1>
  <p style="color:#a3a3ad;margin:0 0 32px;">Here&rsquo;s a summary of your confirmed session.</p>

  <div style="background:#141417;border:1px solid #26262c;border-radius:16px;padding:24px;margin-bottom:28px;">
    <p style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#a3a3ad;margin:0 0 8px;">Package</p>
    <p style="font-size:20px;font-weight:800;color:#fff;margin:0 0 16px;">{pkg_name}</p>
    <p style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#a3a3ad;margin:0 0 4px;">Amount Paid</p>
    <p style="font-size:18px;font-weight:700;color:#10b981;margin:0;">${amount:.2f} {currency}</p>
  </div>

  <h2 style="font-size:17px;font-weight:700;color:#fff;margin:0 0 12px;">What happens next</h2>
  <ol style="color:#a3a3ad;padding-left:20px;line-height:1.8;margin:0 0 28px;">
    <li>Nick will email you within <strong style="color:#e5e5e5;">one business day</strong> to lock in your session time.</li>
    <li>While you wait, jot down the exact challenge you want to break through.</li>
    <li>Sharpen up in the Spartan Coaching app — try the Objection Handler or run a Role-Play scenario.</li>
  </ol>

  <hr style="border:none;border-top:1px solid #26262c;margin:28px 0;"/>
  <p style="font-size:12px;color:#52525b;margin:0;">Questions? Reply to this email or reach out to <a href="mailto:{CONTACT_EMAIL}" style="color:#ef4444;">{CONTACT_EMAIL}</a></p>
</div>"""
            resend.Emails.send({
                "from": f"{RESEND_FROM_NAME} <{RESEND_FROM_EMAIL}>",
                "to": [cust_email],
                "subject": f"Your Spartan Coaching session is confirmed — {pkg_name}",
                "html": customer_html,
                "reply_to": CONTACT_EMAIL,
            })
        return None
    except Exception as exc:
        logger.exception("resend purchase email failed")
        return str(exc)


def _send_trial_expiry_email(customer_email: str, trial_end_ts: int) -> Optional[str]:
    """Send a trial-expiry reminder email to the subscriber.

    Args:
        customer_email: Recipient email address obtained from Stripe Customer object.
        trial_end_ts:   Unix timestamp when the trial ends (from subscription.trial_end).
    Returns:
        None on success, error string on failure.
    """
    if not RESEND_API_KEY:
        return "resend not configured"
    if not customer_email or "@" not in customer_email:
        return "no valid email address"
    try:
        from datetime import datetime, timezone as _tz
        trial_end_dt = datetime.fromtimestamp(trial_end_ts, tz=_tz.utc)
        now_utc      = datetime.now(tz=_tz.utc)
        delta        = trial_end_dt - now_utc
        total_hours  = max(0, int(delta.total_seconds() // 3600))
        if total_hours >= 24:
            time_left_str = f"{total_hours // 24} day{'s' if total_hours // 24 != 1 else ''}"
        elif total_hours > 0:
            time_left_str = f"{total_hours} hour{'s' if total_hours != 1 else ''}"
        else:
            time_left_str = "very soon"

        html = f"""
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0a0a0b;color:#e5e5e5;padding:40px 24px;max-width:600px;margin:0 auto;">
  <p style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#ef4444;margin:0 0 16px;">Spartan Coaching</p>
  <h1 style="font-size:28px;font-weight:800;color:#fff;margin:0 0 8px;">Your free trial ends in {time_left_str}.</h1>
  <p style="color:#a3a3ad;margin:0 0 32px;">Don&rsquo;t lose access to the AI tools that are sharpening your sales edge.</p>

  <div style="background:#141417;border:1px solid #26262c;border-radius:16px;padding:24px;margin-bottom:28px;">
    <p style="font-size:13px;color:#a3a3ad;margin:0 0 12px;">Your trial gives you full access to:</p>
    <ul style="color:#e5e5e5;padding-left:20px;line-height:1.8;margin:0;">
      <li>AI Objection Handler</li>
      <li>Role-Play Scenarios</li>
      <li>Playbook Generator</li>
      <li>Eligibility Checker</li>
    </ul>
  </div>

  <a href="spartan://paywall"
     style="display:block;background:#ef4444;color:#fff;font-size:16px;font-weight:800;
            text-align:center;padding:16px 32px;border-radius:12px;text-decoration:none;
            letter-spacing:0.5px;margin-bottom:28px;">
    Upgrade to Pro — Keep Your Access
  </a>

  <p style="color:#a3a3ad;font-size:14px;line-height:1.6;margin:0 0 28px;">
    After your trial ends, AI tools will be locked until you subscribe.<br/>
    Upgrading takes less than a minute and keeps everything uninterrupted.
  </p>

  <hr style="border:none;border-top:1px solid #26262c;margin:28px 0;"/>
  <p style="font-size:12px;color:#52525b;margin:0;">
    Questions? Reply to this email or reach out to
    <a href="mailto:{CONTACT_EMAIL}" style="color:#ef4444;">{CONTACT_EMAIL}</a>
  </p>
</div>"""

        resend.Emails.send({
            "from":     f"{RESEND_FROM_NAME} <{RESEND_FROM_EMAIL}>",
            "to":       [customer_email],
            "subject":  f"Your Spartan Coaching free trial ends in {time_left_str} — upgrade to keep access",
            "html":     html,
            "reply_to": CONTACT_EMAIL,
        })
        logger.info("trial expiry email sent to %s (trial ends in %s)", customer_email, time_left_str)
        return None
    except Exception as exc:
        logger.exception("trial expiry email failed")
        return str(exc)


async def _finalize_paid_session(session_id: str, payment_status: str, status_val: str, source: str):
    if not pool:
        return
    async with pool.acquire() as conn:
        rec = await conn.fetchrow("SELECT * FROM payment_transactions WHERE session_id = $1", session_id)
        if not rec:
            logger.warning("finalize: unknown session_id=%s (%s)", session_id, source)
            return
        rec_dict      = _row_to_dict(rec)
        already_email = bool(rec_dict.get("email_sent"))
        email_sent    = already_email
        email_error: Optional[str] = rec_dict.get("email_error")
        if payment_status == "paid" and not already_email:
            err = _send_purchase_email(rec_dict)
            email_sent  = err is None
            email_error = err
        await conn.execute(
            "UPDATE payment_transactions SET payment_status=$1, status=$2, updated_at=NOW(), email_sent=$3, email_error=$4 WHERE session_id=$5",
            payment_status, status_val, email_sent, email_error, session_id,
        )


@api.post("/billing/checkout")
async def billing_checkout(req: CheckoutRequest, request: Request):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Payments are not configured.")
    pkg = COACHING_PACKAGES.get(req.package_id)
    if not pkg:
        raise HTTPException(status_code=400, detail="Unknown package.")
    _NATIVE_SCHEMES = {"spartan"}   # allowlist — add schemes here if the app slug changes
    raw_origin = (req.origin_url or "")
    # Detect scheme BEFORE stripping slashes — rstrip("/") on "spartan://" yields
    # "spartan:" which drops the "//" and breaks scheme detection.
    if raw_origin.startswith("http://") or raw_origin.startswith("https://"):
        # Web: standard http(s) origin — strip trailing slash for clean path join
        http_origin = raw_origin.rstrip("/")
        success_url = f"{http_origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url  = f"{http_origin}/services"
    elif "://" in raw_origin and raw_origin.split("://")[0] in _NATIVE_SCHEMES:
        # Native: explicitly allowlisted custom deep-link scheme (e.g. spartan://)
        scheme = raw_origin.split("://")[0]
        success_url = f"{scheme}://payment-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url  = f"{scheme}://services"
    else:
        raise HTTPException(status_code=400, detail="Invalid origin_url.")
    metadata = {
        "package_id":     req.package_id,
        "package_name":   pkg["name"],
        "duration_min":   str(pkg["duration_min"]),
        "customer_name":  req.customer_name or "",
        "customer_email": str(req.customer_email) if req.customer_email else "",
        "notes":          (req.notes or "")[:480],
        "source":         "spartan_coaching_app",
    }
    create_kwargs: dict = {
        "payment_method_types": ["card"],
        "line_items": [{
            "price_data": {
                "currency":     pkg["currency"],
                "unit_amount":  int(pkg["amount"] * 100),
                "product_data": {"name": pkg["name"]},
            },
            "quantity": 1,
        }],
        "mode":        "payment",
        "success_url": success_url,
        "cancel_url":  cancel_url,
        "metadata":    metadata,
    }
    if req.customer_email:
        create_kwargs["customer_email"] = str(req.customer_email)
    try:
        loop    = asyncio.get_event_loop()
        session = await loop.run_in_executor(
            None, lambda: stripe_lib.checkout.Session.create(**create_kwargs)
        )
    except Exception as exc:
        logger.exception("stripe create_checkout_session failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc}")

    if pool:
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO payment_transactions
                        (id, session_id, package_id, package_name, amount_cents, amount, currency,
                         customer_name, customer_email, notes)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                    """,
                    str(uuid.uuid4()), session.id, req.package_id, pkg["name"],
                    int(round(pkg["amount"] * 100)), pkg["amount"], pkg["currency"],
                    req.customer_name, str(req.customer_email) if req.customer_email else None, req.notes,
                )
        except Exception as exc:
            logger.exception("payment_transactions insert failed: %s", exc)

    return {"url": session.url, "session_id": session.id}


@api.get("/billing/status/{session_id}")
async def billing_status(session_id: str):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Payments are not configured.")
    try:
        loop    = asyncio.get_event_loop()
        session = await loop.run_in_executor(
            None, lambda: stripe_lib.checkout.Session.retrieve(session_id)
        )
    except Exception as exc:
        logger.exception("stripe retrieve failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc}")
    await _finalize_paid_session(session_id, session.payment_status, session.status, source="polling")
    return {
        "session_id":     session_id,
        "status":         session.status,
        "payment_status": session.payment_status,
        "amount_total":   session.amount_total,
        "currency":       session.currency,
    }


# ---------- Subscription ----------

@api.get("/subscription/status")
async def subscription_status(request: Request):
    device_id = request.headers.get("X-Device-ID", "")
    if not pool:
        return {"tier": "none", "trial_ends_at": None, "stripe_status": None, "is_active": True, "trial_hours_left": 24, "company_name": None}
    if not device_id:
        # No device ID means the user hasn't made any AI calls yet — treat as pre-trial (24 h available).
        return {"tier": "none", "trial_ends_at": None, "stripe_status": None, "is_active": True, "trial_hours_left": 24, "company_name": None}
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT tier, trial_ends_at, stripe_status, team_code FROM subscriptions WHERE device_id = $1",
            device_id,
        )
        company_name: Optional[str] = None
        if row and row["team_code"]:
            tl = await conn.fetchrow(
                "SELECT company_name, active, stripe_status AS tl_status FROM team_licenses WHERE code = $1",
                row["team_code"],
            )
            if tl:
                company_name = tl["company_name"]
    if not row:
        return {"tier": "none", "trial_ends_at": None, "stripe_status": None, "is_active": True, "trial_hours_left": 24, "company_name": None}
    now = datetime.now(timezone.utc)
    tier          = row["tier"]
    stripe_status = row["stripe_status"]
    trial_ends_at = row["trial_ends_at"]
    team_code     = row["team_code"]
    team_active   = False
    if tier == "team" and team_code and pool:
        async with pool.acquire() as conn2:
            tl2 = await conn2.fetchrow(
                "SELECT active, stripe_status FROM team_licenses WHERE code = $1", team_code
            )
        team_active = bool(tl2 and tl2["active"] and tl2["stripe_status"] in ("active", "trialing"))
    is_active = (
        stripe_status in ("active", "trialing")
        or team_active
        or (trial_ends_at is not None and trial_ends_at > now)
    )
    hours_left = 0
    if trial_ends_at and trial_ends_at > now:
        hours_left = max(0, int((trial_ends_at - now).total_seconds() / 3600))
    return {
        "tier": tier,
        "trial_ends_at": trial_ends_at.isoformat() if trial_ends_at else None,
        "stripe_status": stripe_status,
        "is_active": is_active,
        "trial_hours_left": hours_left,
        "company_name": company_name,
    }


class SubscriptionCheckoutRequest(BaseModel):
    origin_url: Optional[str] = None


@api.post("/subscription/checkout")
async def subscription_checkout(req: SubscriptionCheckoutRequest, request: Request):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Payments are not configured.")
    if not STRIPE_PRO_PRICE_ID:
        raise HTTPException(status_code=503, detail="Subscription product not configured.")
    device_id = request.headers.get("X-Device-ID", "")
    raw_origin = req.origin_url or ""
    _NATIVE_SCHEMES = {"spartan"}
    if raw_origin.startswith("http://") or raw_origin.startswith("https://"):
        http_origin = raw_origin.rstrip("/")
        success_url = f"{http_origin}/subscription-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url  = f"{http_origin}/paywall"
    elif "://" in raw_origin and raw_origin.split("://")[0] in _NATIVE_SCHEMES:
        scheme = raw_origin.split("://")[0]
        success_url = f"{scheme}://subscription-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url  = f"{scheme}://paywall"
    else:
        success_url = "spartan://subscription-success?session_id={CHECKOUT_SESSION_ID}"
        cancel_url  = "spartan://paywall"
    stripe_customer_id = None
    if pool and device_id:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT stripe_customer_id FROM subscriptions WHERE device_id = $1", device_id
            )
            if row:
                stripe_customer_id = row["stripe_customer_id"]
    try:
        loop = asyncio.get_event_loop()
        create_kwargs: dict = {
            "mode": "subscription",
            "line_items": [{"price": STRIPE_PRO_PRICE_ID, "quantity": 1}],
            "success_url": success_url,
            "cancel_url": cancel_url,
            "allow_promotion_codes": True,
            "metadata": {"device_id": device_id or "", "source": "spartan_app"},
            "subscription_data": {"trial_period_days": 1},
        }
        if stripe_customer_id:
            create_kwargs["customer"] = stripe_customer_id
        session = await loop.run_in_executor(
            None, lambda: stripe_lib.checkout.Session.create(**create_kwargs)
        )
    except Exception as exc:
        logger.exception("stripe subscription checkout failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc}")
    return {"url": session.url, "session_id": session.id}


@api.get("/subscription/portal")
async def subscription_portal(request: Request):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Payments are not configured.")
    device_id = request.headers.get("X-Device-ID", "")
    if not device_id or not pool:
        raise HTTPException(status_code=404, detail="No subscription found.")
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT stripe_customer_id FROM subscriptions WHERE device_id = $1", device_id
        )
    if not row or not row["stripe_customer_id"]:
        raise HTTPException(status_code=404, detail="No billing account found. Subscribe first.")
    try:
        loop = asyncio.get_event_loop()
        portal = await loop.run_in_executor(
            None,
            lambda: stripe_lib.billing_portal.Session.create(
                customer=row["stripe_customer_id"],
                return_url="spartan://settings",
            ),
        )
    except Exception as exc:
        logger.exception("stripe portal session failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc}")
    return {"url": portal.url}


class TeamCheckoutRequest(BaseModel):
    seats: int
    origin_url: Optional[str] = None
    contact_email: Optional[str] = None
    company_name: Optional[str] = None


@api.post("/subscription/team-checkout")
async def team_checkout(req: TeamCheckoutRequest, request: Request):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Payments are not configured.")
    if req.seats == 5 and not STRIPE_TEAM_5_PRICE_ID:
        raise HTTPException(status_code=503, detail="5-seat team product not configured.")
    if req.seats == 10 and not STRIPE_TEAM_10_PRICE_ID:
        raise HTTPException(status_code=503, detail="10-seat team product not configured.")
    if req.seats not in (5, 10):
        raise HTTPException(status_code=400, detail="seats must be 5 or 10.")
    price_id = STRIPE_TEAM_5_PRICE_ID if req.seats == 5 else STRIPE_TEAM_10_PRICE_ID
    device_id = request.headers.get("X-Device-ID", "")
    raw_origin = req.origin_url or ""
    if raw_origin.startswith("http://") or raw_origin.startswith("https://"):
        http_origin = raw_origin.rstrip("/")
        success_url = f"{http_origin}/subscription-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url  = f"{http_origin}/paywall"
    else:
        success_url = "spartan://subscription-success?session_id={CHECKOUT_SESSION_ID}"
        cancel_url  = "spartan://team-checkout"
    try:
        loop = asyncio.get_event_loop()
        session = await loop.run_in_executor(
            None,
            lambda: stripe_lib.checkout.Session.create(
                mode="subscription",
                line_items=[{"price": price_id, "quantity": 1}],
                success_url=success_url,
                cancel_url=cancel_url,
                allow_promotion_codes=True,
                customer_email=req.contact_email or None,
                metadata={
                    "source": "spartan_team",
                    "seat_count": str(req.seats),
                    "device_id": device_id or "",
                    "company_name": req.company_name or "",
                    "contact_email": req.contact_email or "",
                },
            ),
        )
    except Exception as exc:
        logger.exception("stripe team checkout failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc}")
    return {"url": session.url, "session_id": session.id}


class TeamRedeemRequest(BaseModel):
    team_code: str


@api.post("/team/redeem")
async def team_redeem(req: TeamRedeemRequest, request: Request):
    if not pool:
        raise HTTPException(status_code=503, detail="Database unavailable.")
    device_id = request.headers.get("X-Device-ID", "").strip()
    if not device_id:
        raise HTTPException(status_code=401, detail="Device identification required.")
    code = req.team_code.strip().upper()
    async with pool.acquire() as conn:
        # Verify license exists and is valid before attempting claim
        tl = await conn.fetchrow(
            "SELECT id, active, stripe_status, seat_count, company_name FROM team_licenses WHERE code = $1",
            code,
        )
        if not tl:
            raise HTTPException(status_code=404, detail="Invalid or expired team code.")
        if not tl["active"] or tl["stripe_status"] not in ("active", "trialing"):
            raise HTTPException(status_code=404, detail="Invalid or expired team code.")

        # Check if device already redeemed this exact code — idempotent
        existing = await conn.fetchrow(
            "SELECT team_code FROM subscriptions WHERE device_id = $1", device_id
        )
        if existing and existing["team_code"] == code:
            # Re-fetch seat count to return accurate seats_remaining
            tl2 = await conn.fetchrow(
                "SELECT seat_count, seats_used FROM team_licenses WHERE code = $1", code
            )
            return {
                "status": "activated",
                "company_name": tl["company_name"],
                "seats_remaining": max(0, tl2["seat_count"] - tl2["seats_used"]),
            }

        # Atomic seat claim: only succeeds if seats_used < seat_count (prevents race oversubscription)
        claimed = await conn.fetchrow(
            """UPDATE team_licenses
               SET seats_used = seats_used + 1, updated_at = NOW()
               WHERE code = $1 AND seats_used < seat_count
               RETURNING seat_count, seats_used""",
            code,
        )
        if not claimed:
            raise HTTPException(status_code=409, detail="All seats on this license are in use.")

        # Upsert subscription row for this device
        await conn.execute(
            """INSERT INTO subscriptions
                   (device_id, tier, team_code)
               VALUES ($1, 'team', $2)
               ON CONFLICT (device_id) DO UPDATE SET
                   tier                   = 'team',
                   team_code              = $2,
                   stripe_customer_id     = NULL,
                   stripe_subscription_id = NULL,
                   stripe_status          = NULL,
                   updated_at             = NOW()""",
            device_id, code,
        )
    seats_remaining = claimed["seat_count"] - claimed["seats_used"]
    return {
        "status": "activated",
        "company_name": tl["company_name"],
        "seats_remaining": max(0, seats_remaining),
    }


@api.get("/admin/team-licenses")
async def admin_team_licenses(_: bool = Depends(require_admin)):
    if not pool:
        raise HTTPException(status_code=503, detail="Database unavailable.")
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, code, company_name, contact_email, seat_count, seats_used,
                      stripe_status, active, created_at, updated_at
               FROM team_licenses ORDER BY created_at DESC"""
        )
    items = [_row_to_dict(r) for r in rows]
    return {"items": items, "count": len(items)}


class ActivateSessionRequest(BaseModel):
    session_id: str


@api.post("/subscription/activate-session")
async def subscription_activate_session(req: ActivateSessionRequest, request: Request):
    """
    Called by the app immediately after Stripe Checkout redirects back.
    Retrieves the completed session from Stripe and activates the subscription
    in our DB without waiting for the webhook — eliminating the race condition.
    Idempotent: safe to call multiple times for the same session.
    """
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Payments are not configured.")
    device_id = request.headers.get("X-Device-ID", "")
    if not device_id:
        raise HTTPException(status_code=400, detail="Device identification required.")

    try:
        loop = asyncio.get_event_loop()
        session = await loop.run_in_executor(
            None,
            lambda: stripe_lib.checkout.Session.retrieve(
                req.session_id,
                expand=["subscription"],
            ),
        )
    except Exception as exc:
        logger.exception("activate-session: stripe retrieve failed session=%s", req.session_id)
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc}")

    if session.get("status") != "complete":
        raise HTTPException(status_code=400, detail="Session not yet complete.")
    if session.get("payment_status") not in ("paid", "no_payment_required"):
        raise HTTPException(status_code=400, detail="Payment not confirmed.")
    if session.get("mode") != "subscription":
        raise HTTPException(status_code=400, detail="Not a subscription session.")

    meta         = session.get("metadata") or {}
    customer_id  = session.get("customer")
    sub_obj      = session.get("subscription") or {}
    sub_id       = sub_obj.get("id") if isinstance(sub_obj, dict) else getattr(sub_obj, "id", None)
    source       = meta.get("source", "")

    if not pool:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    if source == "spartan_team":
        # Team purchase — look up the license that should have been created by the webhook
        # (webhook may already have run; if not, this will retry naturally via polling)
        async with pool.acquire() as conn:
            tl = await conn.fetchrow(
                "SELECT code, company_name, active, stripe_status FROM team_licenses WHERE stripe_subscription_id = $1",
                sub_id,
            ) if sub_id else None
        if not tl:
            raise HTTPException(status_code=202, detail="License not yet provisioned; retry shortly.")
        return {"activated": True, "tier": "team", "company_name": tl["company_name"]}
    else:
        # Individual Pro subscription
        if not sub_id:
            raise HTTPException(status_code=400, detail="No subscription ID on session.")
        # Determine if this is a trialing subscription from the expanded sub object
        _sub_status   = sub_obj.get("status") if isinstance(sub_obj, dict) else getattr(sub_obj, "status", "active")
        _trial_end_ts = sub_obj.get("trial_end") if isinstance(sub_obj, dict) else getattr(sub_obj, "trial_end", None)
        _stripe_status   = _sub_status if _sub_status in ("active", "trialing") else "active"
        _trial_ends_at   = datetime.fromtimestamp(_trial_end_ts, tz=timezone.utc) if _trial_end_ts else None
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO subscriptions
                       (device_id, tier, stripe_customer_id, stripe_subscription_id, stripe_status, trial_ends_at)
                   VALUES ($1, 'pro', $2, $3, $4, $5)
                   ON CONFLICT (device_id) DO UPDATE SET
                       tier                   = 'pro',
                       stripe_customer_id     = $2,
                       stripe_subscription_id = $3,
                       stripe_status          = $4,
                       trial_ends_at          = COALESCE($5, trial_ends_at),
                       updated_at             = NOW()""",
                device_id, customer_id, sub_id, _stripe_status, _trial_ends_at,
            )
        logger.info("activate-session: subscription activated device=%s sub=%s status=%s", device_id, sub_id, _stripe_status)
        return {"activated": True, "tier": "pro", "stripe_status": _stripe_status}


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig  = request.headers.get("Stripe-Signature", "")
    try:
        if STRIPE_WEBHOOK_SECRET:
            # Secret is configured — always require a valid signature; reject missing/invalid ones.
            if not sig:
                logger.warning("stripe webhook: Stripe-Signature header missing (secret is set)")
                raise HTTPException(status_code=400, detail="Missing Stripe-Signature header.")
            stripe_lib.Webhook.construct_event(body, sig, STRIPE_WEBHOOK_SECRET)
        # Normalize to a plain dict for consistent .get() access regardless of SDK version.
        import json as _json
        event = _json.loads(body)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("stripe webhook verify failed")
        raise HTTPException(status_code=400, detail=f"Webhook error: {exc}")

    session_id          = None
    payment_status      = None
    is_subscription_mode = False
    event_type          = event.get("type", "")
    request.state.stripe_event_type = event_type  # available to the exception handler if we crash

    if event_type in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        obj            = event["data"]["object"]
        session_id     = obj.get("id")
        payment_status = obj.get("payment_status", "paid")
        if obj.get("mode") == "subscription":
            is_subscription_mode = True
            meta        = obj.get("metadata") or {}
            source      = meta.get("source", "")
            device_id   = meta.get("device_id", "")
            customer_id = obj.get("customer")
            sub_id      = obj.get("subscription")

            if source == "spartan_team":
                # ---- Team license purchase ----
                if pool:
                    seat_count   = int(meta.get("seat_count", "5") or "5")
                    company_name = meta.get("company_name", "") or obj.get("customer_details", {}).get("name") or None
                    # Prefer explicit metadata email; fall back to Stripe customer_details
                    contact_email = (
                        meta.get("contact_email", "")
                        or obj.get("customer_details", {}).get("email")
                        or None
                    )
                    # DB provisioning is fail-closed: any exception propagates → non-200 → Stripe retries
                    code: Optional[str] = None
                    async with pool.acquire() as conn:
                        # Idempotency: if this subscription already has a license, skip re-provisioning
                        existing_license = await conn.fetchrow(
                            "SELECT code, contact_email FROM team_licenses WHERE stripe_subscription_id = $1",
                            sub_id,
                        ) if sub_id else None
                        if existing_license:
                            code = existing_license["code"]
                            contact_email = contact_email or existing_license["contact_email"]
                            logger.info("team license already exists for sub=%s code=%s (idempotent replay)", sub_id, code)
                        else:
                            code = await _generate_team_code(conn)
                            await conn.execute(
                                """INSERT INTO team_licenses
                                       (code, stripe_customer_id, stripe_subscription_id,
                                        stripe_status, company_name, contact_email, seat_count)
                                   VALUES ($1, $2, $3, 'active', $4, $5, $6)""",
                                code, customer_id, sub_id,
                                company_name, contact_email, seat_count,
                            )
                            logger.info("team license created: code=%s seats=%d customer=%s", code, seat_count, customer_id)
                    # Email delivery is best-effort — failure does not block Stripe acknowledgement
                    if code and RESEND_API_KEY and contact_email:
                        display_company = company_name or "your organization"
                        body_html = f"""
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0a0a0b;color:#e5e5e5;padding:40px 24px;max-width:600px;margin:0 auto;">
  <p style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#ef4444;margin:0 0 16px;">Spartan Coaching</p>
  <h1 style="font-size:28px;font-weight:800;color:#fff;margin:0 0 8px;">Your team license is active</h1>
  <p style="color:#a3a3ad;margin:0 0 32px;">Purchased for {display_company} · {seat_count} seats</p>

  <div style="background:#141417;border:1px solid #26262c;border-radius:16px;padding:32px;margin-bottom:28px;text-align:center;">
    <p style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#a3a3ad;margin:0 0 12px;">Team Access Code</p>
    <p style="font-size:32px;font-weight:900;letter-spacing:4px;color:#ef4444;margin:0;font-family:monospace;">{code}</p>
    <p style="font-size:13px;color:#71717a;margin:12px 0 0;">Share this code with your team</p>
  </div>

  <h2 style="font-size:17px;font-weight:700;color:#fff;margin:0 0 12px;">How your reps redeem it</h2>
  <ol style="color:#a3a3ad;padding-left:20px;line-height:1.8;margin:0 0 28px;">
    <li>Download the <strong style="color:#e5e5e5;">Spartan Coaching</strong> app</li>
    <li>Open <strong style="color:#e5e5e5;">Settings</strong></li>
    <li>Tap <strong style="color:#e5e5e5;">"Have a team code?"</strong></li>
    <li>Enter <strong style="color:#ef4444;font-family:monospace;">{code}</strong> and tap <strong style="color:#e5e5e5;">Redeem</strong></li>
  </ol>
  <p style="color:#a3a3ad;font-size:13px;">Each rep redeems the code once. You have <strong style="color:#e5e5e5;">{seat_count} seats</strong> available.</p>

  <hr style="border:none;border-top:1px solid #26262c;margin:28px 0;"/>
  <p style="font-size:12px;color:#52525b;margin:0;">Questions? Reply to this email or reach out to <a href="mailto:nick@spartanhospicecoaching.com" style="color:#ef4444;">nick@spartanhospicecoaching.com</a></p>
</div>"""
                        try:
                            loop2 = asyncio.get_event_loop()
                            await loop2.run_in_executor(
                                None,
                                lambda: resend.Emails.send({
                                    "from": f"{RESEND_FROM_NAME} <{RESEND_FROM_EMAIL}>",
                                    "to": [contact_email],
                                    "subject": "Your Spartan Coaching team license is active",
                                    "html": body_html,
                                }),
                            )
                            logger.info("team license email sent to %s", contact_email)
                        except Exception as email_exc:
                            logger.error("team license email failed: %s", email_exc)
            else:
                # ---- Individual Pro subscription ----
                if device_id and customer_id and pool:
                    # Capture customer email from checkout session details
                    _wh_cust_email = (obj.get("customer_details") or {}).get("email") or None
                    # Fetch subscription to capture trialing status and trial_end timestamp
                    _wh_stripe_status = "active"
                    _wh_trial_ends_at = None
                    if sub_id:
                        try:
                            _wh_loop = asyncio.get_event_loop()
                            _wh_sub = await _wh_loop.run_in_executor(
                                None, lambda: stripe_lib.Subscription.retrieve(sub_id)
                            )
                            _wh_stripe_status = getattr(_wh_sub, "status", "active")
                            _wh_trial_ts = getattr(_wh_sub, "trial_end", None)
                            if _wh_trial_ts:
                                _wh_trial_ends_at = datetime.fromtimestamp(_wh_trial_ts, tz=timezone.utc)
                        except Exception:
                            pass
                    async with pool.acquire() as conn:
                        await conn.execute(
                            """INSERT INTO subscriptions
                                   (device_id, tier, stripe_customer_id, stripe_subscription_id, stripe_status, trial_ends_at, customer_email)
                               VALUES ($1, 'pro', $2, $3, $4, $5, $6)
                               ON CONFLICT (device_id) DO UPDATE SET
                                   tier                   = 'pro',
                                   stripe_customer_id     = $2,
                                   stripe_subscription_id = $3,
                                   stripe_status          = $4,
                                   trial_ends_at          = COALESCE($5, trial_ends_at),
                                   customer_email         = COALESCE($6, customer_email),
                                   updated_at             = NOW()""",
                            device_id, customer_id, sub_id, _wh_stripe_status, _wh_trial_ends_at, _wh_cust_email,
                        )
                    logger.info("subscription activated: device=%s customer=%s sub=%s status=%s", device_id, customer_id, sub_id, _wh_stripe_status)
    elif event_type == "checkout.session.async_payment_failed":
        obj            = event["data"]["object"]
        session_id     = obj.get("id")
        payment_status = "failed"
    elif event_type == "customer.subscription.updated":
        obj    = event["data"]["object"]
        sub_id = obj.get("id")
        status = obj.get("status", "")
        _upd_trial_ts   = obj.get("trial_end")
        _upd_trial_ends = datetime.fromtimestamp(_upd_trial_ts, tz=timezone.utc) if _upd_trial_ts else None
        if sub_id and pool:
            async with pool.acquire() as conn:
                await conn.execute(
                    """UPDATE subscriptions
                       SET stripe_status = $1,
                           trial_ends_at = COALESCE($2, trial_ends_at),
                           updated_at    = NOW()
                       WHERE stripe_subscription_id = $3""",
                    status, _upd_trial_ends, sub_id,
                )
                # Keep team_licenses in sync — deactivate on past_due / unpaid etc.
                await conn.execute(
                    """UPDATE team_licenses
                       SET stripe_status = $1,
                           active = (CASE WHEN $1 = 'active' THEN true ELSE false END),
                           updated_at = NOW()
                       WHERE stripe_subscription_id = $2""",
                    status, sub_id,
                )
            logger.info("subscription updated: sub=%s status=%s", sub_id, status)
        if status in ("past_due", "unpaid"):
            customer_id_upd = obj.get("customer", "")
            await _send_payment_failure_alert(
                event_type, sub_id, customer_id_upd, status,
                extra="Subscription renewal charge failed. Customer access has been downgraded.",
            )
    elif event_type == "customer.subscription.deleted":
        obj    = event["data"]["object"]
        sub_id = obj.get("id")
        if sub_id and pool:
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE subscriptions SET stripe_status = 'canceled', updated_at = NOW() WHERE stripe_subscription_id = $1",
                    sub_id,
                )
                # Revoke team license — existing redeemed seats also lose access via check_subscription
                await conn.execute(
                    """UPDATE team_licenses
                       SET stripe_status = 'canceled', active = false, updated_at = NOW()
                       WHERE stripe_subscription_id = $1""",
                    sub_id,
                )
            logger.info("subscription canceled: sub=%s", sub_id)
    elif event_type == "customer.subscription.trial_will_end":
        obj         = event["data"]["object"]
        customer_id = obj.get("customer")
        trial_end   = obj.get("trial_end")
        if customer_id and trial_end and RESEND_API_KEY:
            try:
                _twe_loop = asyncio.get_event_loop()
                # Try DB-first lookup; avoids a Stripe round-trip when email was captured at checkout
                _twe_email: Optional[str] = None
                if pool:
                    async with pool.acquire() as _twe_conn:
                        _twe_row = await _twe_conn.fetchrow(
                            "SELECT customer_email FROM subscriptions WHERE stripe_customer_id = $1",
                            customer_id,
                        )
                        if _twe_row:
                            _twe_email = _twe_row["customer_email"]
                # Fall back to Stripe Customer.retrieve if the column is NULL
                if not _twe_email:
                    _twe_customer = await _twe_loop.run_in_executor(
                        None, lambda: stripe_lib.Customer.retrieve(customer_id)
                    )
                    _twe_email = getattr(_twe_customer, "email", None) if _twe_customer else None
                if _twe_email:
                    _twe_err = await _twe_loop.run_in_executor(
                        None, lambda: _send_trial_expiry_email(_twe_email, int(trial_end))
                    )
                    if _twe_err:
                        logger.error("trial expiry email error: %s", _twe_err)
                else:
                    logger.warning("trial_will_end: no email for customer=%s", customer_id)
            except Exception as _twe_exc:
                logger.error("trial_will_end handler error: %s", _twe_exc)

    elif event_type == "invoice.payment_failed":
        obj             = event["data"]["object"]
        _inv_sub_id     = obj.get("subscription", "")
        _inv_customer   = obj.get("customer", "")
        _inv_id         = obj.get("id", "")
        _inv_attempt    = obj.get("attempt_count", "")
        _inv_next       = obj.get("next_payment_attempt")
        _inv_extra      = f"Invoice: {_inv_id}"
        if _inv_attempt:
            _inv_extra += f" | Attempt #{_inv_attempt}"
        if _inv_next:
            from datetime import datetime, timezone as _tz
            _inv_next_dt = datetime.fromtimestamp(_inv_next, tz=_tz.utc).strftime("%Y-%m-%d %H:%M UTC")
            _inv_extra += f" | Next retry: {_inv_next_dt}"
        logger.warning("invoice.payment_failed: sub=%s customer=%s invoice=%s attempt=%s", _inv_sub_id, _inv_customer, _inv_id, _inv_attempt)
        await _send_payment_failure_alert(
            event_type, _inv_sub_id, _inv_customer, "invoice_payment_failed",
            extra=_inv_extra,
        )

    if session_id and not is_subscription_mode:
        await _finalize_paid_session(session_id, payment_status or "unknown", event_type, source=f"webhook:{event_type}")
    return {"received": True}


# ---------- Static content (repo-mirrored) ----------
@api.get("/content/testimonials")
async def content_testimonials():
    return {"testimonials": REPO_TESTIMONIALS, "caseStudies": REPO_CASE_STUDIES}


def _article_row_to_dict(r) -> dict:
    return {
        "id": r["id"],
        "title": r["title"],
        "description": r["description"],
        "body": r["body"],
        "linkedinUrl": r["linkedin_url"],
        "publishDate": str(r["publish_date"]),
        "featured": r["featured"],
        "sortOrder": r["sort_order"],
    }


@api.get("/content/articles")
async def content_articles():
    if not pool:
        return {"articles": REPO_ARTICLES}
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, title, description, body, linkedin_url, publish_date, featured, sort_order "
            "FROM articles ORDER BY sort_order ASC, publish_date DESC"
        )
    return {"articles": [_article_row_to_dict(r) for r in rows]}


@api.get("/content/articles/{article_id}")
async def content_article(article_id: str):
    if not pool:
        raise HTTPException(status_code=503, detail="Database unavailable")
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, title, description, body, linkedin_url, publish_date, featured "
            "FROM articles WHERE id = $1",
            article_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Article not found")
    return _article_row_to_dict(row)


@api.get("/content/podcasts")
async def content_podcasts():
    return {"podcasts": REPO_PODCASTS}


@api.get("/content/resources")
async def content_resources():
    return {"resources": REPO_RESOURCES}


# ---------- Mount ----------
app.include_router(api)
