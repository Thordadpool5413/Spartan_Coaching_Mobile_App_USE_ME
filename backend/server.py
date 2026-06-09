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
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
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
STRIPE_API_KEY        = os.environ.get("STRIPE_API_KEY")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
]


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
        logger.info("PostgreSQL pool ready")
    except Exception as exc:
        logger.error("PostgreSQL startup failed: %s", exc)

    resend_status  = "configured" if RESEND_API_KEY else "DISABLED"
    ai_status      = "configured" if OPENAI_API_KEY else "DISABLED"
    stripe_status  = "configured" if STRIPE_API_KEY else "DISABLED"
    admin_warn     = "" if (ADMIN_TOKEN and ADMIN_TOKEN != "spartan-admin") else " ⚠ DEFAULT token"
    logger.info(
        "Spartan API up | DB=%s | AI=%s | Stripe=%s | Resend=%s | Admin=%s%s",
        "ok" if pool else "UNAVAILABLE",
        ai_status, stripe_status, resend_status,
        ADMIN_TOKEN[:6] + "…" if ADMIN_TOKEN else "(unset)",
        admin_warn,
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


# Rate limiter — 30 AI requests / 60 s per IP
_RATE_WINDOW  = 60
_RATE_MAX     = 30
_rate_buckets: dict[str, deque] = defaultdict(deque)


def rate_limit_ai(request: Request) -> None:
    ip  = request.client.host if request.client else "unknown"
    now = _time.time()
    bkt = _rate_buckets[ip]
    while bkt and now - bkt[0] > _RATE_WINDOW:
        bkt.popleft()
    if len(bkt) >= _RATE_MAX:
        raise HTTPException(
            status_code=429,
            detail=f"Too many AI requests — limit is {_RATE_MAX}/min. Try again shortly.",
        )
    bkt.append(now)


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


class ChatResponse(BaseModel):
    response: str


class AskRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)


class ObjectionRequest(BaseModel):
    objection: str = Field(..., min_length=3, max_length=1000)
    context: Optional[str] = Field(default=None, max_length=1000)


class PlaybookRequest(BaseModel):
    scenario: str = Field(..., min_length=10, max_length=2000)
    referralSourceType: Optional[str] = None
    goal: Optional[str] = None


class RoleplayMessage(BaseModel):
    role: Literal["user", "model"]
    content: str


class RoleplayRequest(BaseModel):
    scenarioId: str
    userMessage: str = Field(..., min_length=1, max_length=2000)
    history: List[RoleplayMessage] = Field(default_factory=list)


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
    rate_limit_ai(request)
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
        except Exception:
            pass
    return ChatResponse(response=text)


@api.post("/ask", response_model=ChatResponse)
async def ask_endpoint(req: AskRequest, request: Request):
    rate_limit_ai(request)
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
    rate_limit_ai(request)
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
    rate_limit_ai(request)
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
    rate_limit_ai(request)
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
async def roleplay_feedback(req: RoleplayFeedbackRequest):
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
    rate_limit_ai(request)
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
        except Exception:
            pass
    return {"verdict": verdict, "summary": summary}


# ---------- Admin ----------
def require_admin(authorization: Optional[str] = Header(default=None)):
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
        cust_email = record.get("customer_email") or "(not provided)"
        notes      = record.get("notes") or "(none)"
        sess       = record.get("session_id", "")
        html = f"""
<h2>New Coaching Session Booked & Paid</h2>
<p><strong>Package:</strong> {pkg_name}</p>
<p><strong>Amount paid:</strong> ${amount:.2f} {currency}</p>
<hr/>
<p><strong>Customer name:</strong> {cust_name}</p>
<p><strong>Customer email:</strong> {cust_email}</p>
<p><strong>Notes / prep:</strong></p>
<p style="white-space: pre-wrap;">{notes}</p>
<hr/>
<p style="color:#888;font-size:12px;">Stripe session: {sess}<br/>Reply to this email to coordinate scheduling.</p>
"""
        kwargs: dict = {
            "from": f"{RESEND_FROM_NAME} <{RESEND_FROM_EMAIL}>",
            "to": [CONTACT_EMAIL],
            "subject": f"New paid coaching booking — {pkg_name}",
            "html": html,
        }
        if cust_email and "@" in str(cust_email):
            kwargs["reply_to"] = cust_email
        resend.Emails.send(kwargs)
        return None
    except Exception as exc:
        logger.exception("resend purchase email failed")
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
    raw_origin = (req.origin_url or "").rstrip("/")
    if raw_origin.startswith("http://") or raw_origin.startswith("https://"):
        # Web: standard http(s) origin
        success_url = f"{raw_origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url  = f"{raw_origin}/services"
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


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig  = request.headers.get("Stripe-Signature", "")
    try:
        if STRIPE_WEBHOOK_SECRET and sig:
            event = stripe_lib.Webhook.construct_event(body, sig, STRIPE_WEBHOOK_SECRET)
        else:
            import json as _json
            event = stripe_lib.Event.construct_from(_json.loads(body), stripe_lib.api_key)
    except Exception as exc:
        logger.exception("stripe webhook verify failed")
        raise HTTPException(status_code=400, detail=f"Webhook error: {exc}")

    session_id     = None
    payment_status = None
    event_type     = event.get("type", "")

    if event_type in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        obj            = event["data"]["object"]
        session_id     = obj.get("id")
        payment_status = obj.get("payment_status", "paid")
    elif event_type == "checkout.session.async_payment_failed":
        obj            = event["data"]["object"]
        session_id     = obj.get("id")
        payment_status = "failed"

    if session_id:
        await _finalize_paid_session(session_id, payment_status or "unknown", event_type, source=f"webhook:{event_type}")
    return {"received": True}


# ---------- Static content (repo-mirrored) ----------
@api.get("/content/testimonials")
async def content_testimonials():
    return {"testimonials": REPO_TESTIMONIALS, "caseStudies": REPO_CASE_STUDIES}


@api.get("/content/articles")
async def content_articles():
    return {"articles": REPO_ARTICLES}


@api.get("/content/podcasts")
async def content_podcasts():
    return {"podcasts": REPO_PODCASTS}


@api.get("/content/resources")
async def content_resources():
    return {"resources": REPO_RESOURCES}


# ---------- Mount ----------
app.include_router(api)
