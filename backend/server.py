"""
Spartan Coaching - FastAPI Backend
Powers a React Native / Expo iOS mobile app
"""
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Literal

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient

import resend
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    CheckoutSessionRequest,
)
from collections import defaultdict, deque
import time as _time

from content import (
    SPARTAN_SYSTEM_INSTRUCTION,
    ROLEPLAY_CHARACTERS,
    ROLEPLAY_FEEDBACK_PROMPT_TEMPLATE,
    ALL_DRILLS,
    KNOWLEDGE_BASE_ENTRIES,
)

# ---------- Setup ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("spartan")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
RESEND_FROM_NAME = os.environ.get("RESEND_FROM_NAME", "Spartan Coaching App")
CONTACT_EMAIL = os.environ.get("CONTACT_EMAIL", "nick@spartanhospicecoaching.com")
LLM_MODEL = os.environ.get("LLM_MODEL", "gpt-4o")
LLM_MODEL_FAST = os.environ.get("LLM_MODEL_FAST", "gpt-4o-mini")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "spartan-admin")
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ALLOWED_ORIGINS", "*").split(",")
    if o.strip()
]

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=__import__("certifi").where() if MONGO_URL and "mongodb+srv" in MONGO_URL else None)
db = client[DB_NAME]

app = FastAPI(title="Spartan Coaching API")
api = APIRouter(prefix="/api")


@app.on_event("startup")
async def startup_validate():
    """Print a one-line config summary at startup so logs make production state obvious."""
    is_atlas = MONGO_URL and ("mongodb+srv" in MONGO_URL or ".mongodb.net" in MONGO_URL)
    db_host = (MONGO_URL or "").split("@")[-1].split("/")[0] if MONGO_URL else "(unset)"
    cors_summary = "ALL" if CORS_ALLOWED_ORIGINS == ["*"] else f"{len(CORS_ALLOWED_ORIGINS)} origin(s)"
    resend_status = "configured" if RESEND_API_KEY else "DISABLED"
    resend_from = RESEND_FROM_EMAIL or "(default)"
    admin_token_status = "rotated" if ADMIN_TOKEN and ADMIN_TOKEN != "spartan-admin" else "DEFAULT - rotate before prod"
    try:
        ping = await db.command("ping")
        mongo_ok = ping.get("ok") == 1
    except Exception as exc:
        mongo_ok = False
        logger.error("MongoDB ping failed: %s", exc)
    # Ensure indexes exist for fast admin queries and uniqueness
    if mongo_ok:
        try:
            await db.contacts.create_index([("created_at", -1)])
            await db.eligibility_checks.create_index([("created_at", -1)])
            await db.chat_logs.create_index([("created_at", -1)])
            await db.drill_completions.create_index([("deviceId", 1), ("dateKey", 1)], unique=True)
            await db.drill_completions.create_index([("dateKey", -1)])
        except Exception as exc:
            logger.warning("Index creation skipped: %s", exc)
    logger.info(
        "Spartan Coaching API up | Mongo=%s (%s, %s) | CORS=%s | Resend=%s (from %s) | Admin=%s",
        "Atlas" if is_atlas else "Local/Other",
        db_host,
        "OK" if mongo_ok else "UNREACHABLE",
        cors_summary,
        resend_status,
        resend_from,
        admin_token_status,
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# In-memory IP rate limiter for AI endpoints.
# Window: 60 seconds, max 30 AI requests per IP.
_RATE_WINDOW_SECONDS = 60
_RATE_MAX_REQUESTS = 30
_rate_buckets: dict[str, deque] = defaultdict(deque)


def rate_limit_ai(request: "Request") -> None:
    ip = request.client.host if request.client else "unknown"
    now = _time.time()
    bucket = _rate_buckets[ip]
    while bucket and now - bucket[0] > _RATE_WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= _RATE_MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=f"Too many AI requests. Limit is {_RATE_MAX_REQUESTS} per minute. Try again shortly.",
        )
    bucket.append(now)


async def llm_complete(system: str, user_text: str, model: str = LLM_MODEL_FAST, history: Optional[List[dict]] = None) -> str:
    """Non-streaming completion. history is list of {role: 'user'|'model', content: str}. Falls back to LLM_MODEL_FAST on budget errors."""
    # Embed history as plain context if provided (lightweight approach)
    composed = user_text
    if history:
        transcript_lines = []
        for msg in history[-12:]:
            role = msg.get("role", "user")
            content = (msg.get("content") or "").strip()
            label = "User" if role == "user" else "Assistant"
            if content:
                transcript_lines.append(f"{label}: {content}")
        if transcript_lines:
            composed = "Conversation so far:\n" + "\n".join(transcript_lines) + f"\n\nUser: {user_text}\n\nAssistant:"

    async def _attempt(use_model: str) -> str:
        session_id = str(uuid.uuid4())
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system).with_model("openai", use_model)
        reply = await chat.send_message(UserMessage(text=composed))
        return reply if isinstance(reply, str) else str(reply)

    try:
        return await _attempt(model)
    except Exception as exc:
        msg = str(exc).lower()
        # Fall back to the fast model on budget/rate errors
        if model != LLM_MODEL_FAST and ("budget" in msg or "rate" in msg or "quota" in msg or "429" in msg):
            logger.warning("Falling back from %s to %s due to: %s", model, LLM_MODEL_FAST, exc)
            return await _attempt(LLM_MODEL_FAST)
        raise


# ---------- Models ----------
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


class DrillCompleteRequest(BaseModel):
    deviceId: str
    drillIndex: int
    dateKey: str  # YYYY-MM-DD


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
    functionalScale: Optional[str] = Field(default=None, max_length=20)  # 'FAST' or 'PPS' or 'KPS'
    recentEvents: Optional[str] = Field(default=None, max_length=800)
    notes: Optional[str] = Field(default=None, max_length=800)


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
    except Exception as exc:
        logger.exception("chat failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    # Persist conversation log (anonymous)
    await db.chat_logs.insert_one({
        "id": str(uuid.uuid4()),
        "prompt": req.prompt,
        "response": text,
        "created_at": now_iso(),
    })
    return ChatResponse(response=text)


@api.post("/ask", response_model=ChatResponse)
async def ask_endpoint(req: AskRequest, request: Request):
    rate_limit_ai(request)
    prompt = f"A hospice growth professional asks: {req.question}\n\nGive a clear, concrete, field-ready answer (300-500 words). Use bullets or numbered steps where they help."
    try:
        text = await llm_complete(SPARTAN_SYSTEM_INSTRUCTION, prompt, model=LLM_MODEL_FAST)
    except Exception as exc:
        logger.exception("ask failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    return ChatResponse(response=text)


# ---------- AI: Objection Handler ----------
@api.post("/tools/objection", response_model=ChatResponse)
async def objection_endpoint(req: ObjectionRequest, request: Request):
    rate_limit_ai(request)
    prompt = (
        f"OBJECTION HEARD: \"{req.objection}\"\n\n"
        f"{'CONTEXT: ' + req.context + chr(10) + chr(10) if req.context else ''}"
        "Provide three patient-centered, ethical responses a hospice liaison can use in the next 24 hours:\n"
        "1. A clinical/evidence-based response\n2. An empathetic/relational response\n3. A practical/next-step response\n\n"
        "For each, give the exact words to say (2-4 sentences), then a one-line coaching note on why it works."
    )
    try:
        text = await llm_complete(SPARTAN_SYSTEM_INSTRUCTION, prompt, model=LLM_MODEL_FAST)
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
        "Build a complete pre-visit sales playbook using The Healthcare Sales Mastery Model (Discovery, Connecting, Guiding, Commitment).\n\n"
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
    except Exception as exc:
        logger.exception("roleplay failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    return ChatResponse(response=text)


class RoleplayFeedbackResponse(BaseModel):
    feedback: str
    rating: int


@api.post("/roleplay/feedback", response_model=RoleplayFeedbackResponse)
async def roleplay_feedback(req: RoleplayFeedbackRequest):
    scenario = ROLEPLAY_CHARACTERS.get(req.scenarioId)
    if not scenario:
        raise HTTPException(status_code=404, detail="Unknown scenario")
    transcript_text = "\n\n".join(
        f"{'Sales Rep' if m.role == 'user' else 'Prospect/Contact'}: {m.content}" for m in req.transcript
    )
    prompt = ROLEPLAY_FEEDBACK_PROMPT_TEMPLATE.format(
        scenario_title=scenario["title"], conversation_text=transcript_text
    )
    system = "You are an expert hospice sales coach providing detailed, constructive feedback on practice role-play sessions. Be specific, reference actual quotes, and provide actionable advice based on the Spartan Method (Discipline, Empathy, Strategy). Be encouraging but honest."
    try:
        text = await llm_complete(system, prompt, model=LLM_MODEL)
    except Exception as exc:
        logger.exception("roleplay feedback failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    import re
    m = re.search(r"RATING:\s*(\d+)", text, re.IGNORECASE)
    rating = max(1, min(10, int(m.group(1)))) if m else 5
    feedback = re.sub(r"RATING:\s*\d+\n?", "", text, flags=re.IGNORECASE).strip()
    return RoleplayFeedbackResponse(feedback=feedback, rating=rating)


# ---------- Drills ----------
@api.get("/drills/all")
async def get_all_drills():
    return {"drills": [{"index": i, **d} for i, d in enumerate(ALL_DRILLS)]}


@api.get("/drills/today")
async def get_today_drill():
    today = datetime.now(timezone.utc).date()
    day_of_year = (today - datetime(today.year, 1, 1, tzinfo=timezone.utc).date()).days
    idx = day_of_year % len(ALL_DRILLS)
    d = ALL_DRILLS[idx]
    return {"index": idx, "category": d["category"], "drill": d["drill"], "dateKey": today.isoformat()}


@api.post("/drills/complete")
async def complete_drill(req: DrillCompleteRequest):
    await db.drill_completions.update_one(
        {"deviceId": req.deviceId, "dateKey": req.dateKey},
        {"$set": {"deviceId": req.deviceId, "dateKey": req.dateKey, "drillIndex": req.drillIndex, "completed_at": now_iso()}},
        upsert=True,
    )
    return await drill_stats(req.deviceId)


@api.get("/drills/stats/{device_id}")
async def drill_stats(device_id: str):
    from datetime import timedelta
    cursor = db.drill_completions.find({"deviceId": device_id}).sort("dateKey", -1)
    completions = []
    async for doc in cursor:
        completions.append({"dateKey": doc["dateKey"], "drillIndex": doc.get("drillIndex")})
    today = datetime.now(timezone.utc).date()
    completion_dates = {datetime.strptime(c["dateKey"], "%Y-%m-%d").date() for c in completions}
    # Streak: count consecutive days back from today (or yesterday if today not done)
    streak = 0
    cursor_date = today if today in completion_dates else today - timedelta(days=1)
    while cursor_date in completion_dates:
        streak += 1
        cursor_date -= timedelta(days=1)
    # Heatmap: last 90 days
    heatmap = [
        {"date": (today - timedelta(days=i)).isoformat(), "done": (today - timedelta(days=i)) in completion_dates}
        for i in range(89, -1, -1)
    ]
    return {
        "totalCompleted": len(completions),
        "streak": streak,
        "completions": completions[:30],
        "heatmap": heatmap,
    }


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
    record = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "email": req.email,
        "phone": req.phone,
        "company": req.company,
        "serviceInterest": req.serviceInterest,
        "message": req.message,
        "created_at": now_iso(),
        "email_sent": False,
        "email_error": None,
    }
    # Try to send via Resend
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
            record["email_sent"] = True
        except Exception as exc:
            logger.exception("resend failed")
            record["email_error"] = str(exc)
    await db.contacts.insert_one(record)
    return {"id": record["id"], "email_sent": record["email_sent"]}


# ---------- Method content (static) ----------
@api.get("/method")
async def method_content():
    return {
        "pillars": [
            {"id": "discipline", "title": "Discipline", "description": "Structure and consistency. Show up prepared, execute with precision, track what matters."},
            {"id": "empathy", "title": "Empathy", "description": "Human connection. Listen with intent, understand unspoken needs, build trust beyond a single referral."},
            {"id": "strategy", "title": "Strategy", "description": "Act with purpose. Use data, market insights, and proven tools to focus where impact is highest."},
        ],
        "subjects": [
            {"id": "discovery", "title": "Discovery", "icon": "compass", "color": "#3b82f6", "purpose": "Discovery is learning about the contact and their individual needs.", "executionStandard": "Ask targeted questions about workflow, decision-making, and patient transition concerns. Listen for the specific language the contact uses.", "measurableOutput": "A completed contact profile capturing stated needs, preferred communication style, decision-making role, and confidence triggers."},
            {"id": "connecting", "title": "Connecting", "icon": "users", "color": "#a855f7", "purpose": "Connecting happens after Discovery. Align to how the contact wants to work, communicate, and move decisions forward.", "executionStandard": "Reference what they shared. Adapt your cadence, format, and content. Confirm mutual understanding of how you will work together.", "measurableOutput": "A documented working agreement reflecting preferred communication method, frequency, and team support."},
            {"id": "guiding", "title": "Guiding", "icon": "target", "color": "#f97316", "purpose": "Use hospice solutions to solve and improve the needs of the contact and account.", "executionStandard": "Present specific capabilities that address identified needs and friction points. Use real examples and clinical support tools.", "measurableOutput": "The contact can articulate at least one specific way your team solves a problem they identified."},
            {"id": "commitment", "title": "Commitment", "icon": "check", "color": "#16a34a", "purpose": "Commit to a patient referral. Make the next step clear action.", "executionStandard": "Define the referral trigger clearly. Establish who calls, when, how, and what happens once received.", "measurableOutput": "A referral pathway document or verbal commitment naming trigger, caller, method, and follow-up process."},
        ],
        "fundamentals": [
            {"title": "Mamba mentality in practice and performance", "description": "Repetitions on purpose, film review, and one tiny edge after every session."},
            {"title": "Plain language that busy clinical leaders can use the same day", "description": "No jargon. Every word earns its place."},
            {"title": "Minimum necessary data with named users only", "description": "Track what matters, discard the noise."},
            {"title": "Shared definitions and formulas, so numbers cannot be gamed", "description": "Transparent metrics eliminate ambiguity."},
            {"title": "Visible work that another person can see, repeat, and coach", "description": "If it cannot be observed, it cannot be improved."},
        ],
        "ethics": [
            {"title": "Patient choice is honored at every step", "icon": "heart"},
            {"title": "Clinical judgment is supported and never replaced", "icon": "shield"},
            {"title": "Privacy is protected by behavior and explained in human language", "icon": "eye"},
            {"title": "Only the minimum necessary data is used", "icon": "database"},
            {"title": "Only named users have access", "icon": "user-check"},
            {"title": "No protected information leaves approved systems", "icon": "lock"},
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
One concrete action the referral source can take in the next 24 hours (e.g., request a hospice info visit, share this summary with the hospice intake nurse, schedule a goals-of-care conversation, etc.).

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
    except Exception as exc:
        logger.exception("eligibility failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    # Extract verdict
    import re
    m = re.search(r"VERDICT:\s*(LIKELY|POSSIBLE|NOT_YET)", text, re.IGNORECASE)
    verdict = m.group(1).upper() if m else "POSSIBLE"
    # Strip the VERDICT: line
    summary = re.sub(r"VERDICT:\s*(LIKELY|POSSIBLE|NOT_YET)\s*\n?", "", text, flags=re.IGNORECASE).strip()
    # Save anonymously for analytics
    await db.eligibility_checks.insert_one({
        "id": str(uuid.uuid4()),
        "diagnosis": req.diagnosis,
        "verdict": verdict,
        "indicators_count": len(req.indicators),
        "created_at": now_iso(),
    })
    return {"verdict": verdict, "summary": summary}


# ---------- Admin (lightweight, token-protected) ----------
from fastapi import Header, Depends


def require_admin(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing admin token")
    token = authorization.split(" ", 1)[1].strip()
    if token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid admin token")
    return True


@api.get("/admin/overview")
async def admin_overview(_: bool = Depends(require_admin)):
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    cutoffs = {
        "today": (now - timedelta(days=1)).isoformat(),
        "week": (now - timedelta(days=7)).isoformat(),
        "month": (now - timedelta(days=30)).isoformat(),
    }

    async def count_since(collection, since):
        return await collection.count_documents({"created_at": {"$gte": since}})

    contacts_total = await db.contacts.count_documents({})
    contacts_today = await count_since(db.contacts, cutoffs["today"])
    contacts_week = await count_since(db.contacts, cutoffs["week"])
    contacts_month = await count_since(db.contacts, cutoffs["month"])

    elig_total = await db.eligibility_checks.count_documents({})
    elig_week = await count_since(db.eligibility_checks, cutoffs["week"])

    # Verdict breakdown (last 30 days)
    verdict_pipeline = [
        {"$match": {"created_at": {"$gte": cutoffs["month"]}}},
        {"$group": {"_id": "$verdict", "count": {"$sum": 1}}},
    ]
    verdict_breakdown = {doc["_id"]: doc["count"] async for doc in db.eligibility_checks.aggregate(verdict_pipeline)}

    # Top diagnoses (last 30 days)
    diag_pipeline = [
        {"$match": {"created_at": {"$gte": cutoffs["month"]}}},
        {"$group": {"_id": "$diagnosis", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]
    top_diagnoses = [{"diagnosis": d["_id"], "count": d["count"]} async for d in db.eligibility_checks.aggregate(diag_pipeline)]

    # Drill completions
    drills_total = await db.drill_completions.count_documents({})
    unique_drillers_pipeline = [
        {"$group": {"_id": "$deviceId"}},
        {"$count": "uniq"},
    ]
    uniq_drillers_doc = await db.drill_completions.aggregate(unique_drillers_pipeline).to_list(length=1)
    unique_drillers = uniq_drillers_doc[0]["uniq"] if uniq_drillers_doc else 0

    chat_total = await db.chat_logs.count_documents({})
    chat_week = await count_since(db.chat_logs, cutoffs["week"])

    return {
        "generated_at": now.isoformat(),
        "contacts": {
            "total": contacts_total,
            "today": contacts_today,
            "last_7_days": contacts_week,
            "last_30_days": contacts_month,
        },
        "eligibility_checks": {
            "total": elig_total,
            "last_7_days": elig_week,
            "verdict_breakdown_30d": verdict_breakdown,
            "top_diagnoses_30d": top_diagnoses,
        },
        "drills": {
            "total_completions": drills_total,
            "unique_users": unique_drillers,
        },
        "ai_chat": {
            "total": chat_total,
            "last_7_days": chat_week,
        },
    }


@api.get("/admin/contacts")
async def admin_contacts(_: bool = Depends(require_admin), limit: int = 50):
    cursor = db.contacts.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    items = [doc async for doc in cursor]
    return {"items": items, "count": len(items)}


@api.get("/admin/eligibility")
async def admin_eligibility(_: bool = Depends(require_admin), limit: int = 100):
    cursor = db.eligibility_checks.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    items = [doc async for doc in cursor]
    return {"items": items, "count": len(items)}


# ---------- Billing / Stripe Checkout ----------
# SECURITY: Packages and prices are defined ONLY on the server.
# Frontend sends a package_id; backend looks up the real amount.
COACHING_PACKAGES = {
    "coaching_30": {
        "name": "Virtual Coaching Session — 30 minutes",
        "amount": 40.00,
        "currency": "usd",
        "duration_min": 30,
    },
    "coaching_60": {
        "name": "Virtual Coaching Session — 60 minutes",
        "amount": 70.00,
        "currency": "usd",
        "duration_min": 60,
    },
}


class CheckoutRequest(BaseModel):
    package_id: str
    origin_url: str
    customer_name: Optional[str] = Field(default=None, max_length=120)
    customer_email: Optional[EmailStr] = None
    notes: Optional[str] = Field(default=None, max_length=600)


def _make_stripe(request: Request) -> StripeCheckout:
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Payments are not configured.")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


@api.post("/billing/checkout")
async def billing_checkout(req: CheckoutRequest, request: Request):
    pkg = COACHING_PACKAGES.get(req.package_id)
    if not pkg:
        raise HTTPException(status_code=400, detail="Unknown package.")

    origin = (req.origin_url or "").rstrip("/")
    if not origin.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid origin_url.")

    success_url = f"{origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/services"

    stripe = _make_stripe(request)
    metadata = {
        "package_id": req.package_id,
        "package_name": pkg["name"],
        "duration_min": str(pkg["duration_min"]),
        "customer_name": req.customer_name or "",
        "customer_email": req.customer_email or "",
        "notes": (req.notes or "")[:480],
        "source": "spartan_coaching_app",
    }

    checkout_req = CheckoutSessionRequest(
        amount=float(pkg["amount"]),
        currency=pkg["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    try:
        session: CheckoutSessionResponse = await stripe.create_checkout_session(checkout_req)
    except Exception as exc:
        logger.exception("stripe create_checkout_session failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc}")

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "package_id": req.package_id,
        "package_name": pkg["name"],
        "amount": float(pkg["amount"]),
        "currency": pkg["currency"],
        "customer_name": req.customer_name,
        "customer_email": req.customer_email,
        "notes": req.notes,
        "metadata": metadata,
        "status": "initiated",
        "payment_status": "unpaid",
        "email_sent": False,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    return {"url": session.url, "session_id": session.session_id}


def _send_purchase_email(record: dict) -> Optional[str]:
    """Notify Nick of a new paid coaching session. Returns error string on failure, None on success."""
    if not RESEND_API_KEY:
        return "resend not configured"
    try:
        pkg_name = record.get("package_name") or record.get("metadata", {}).get("package_name") or "Coaching Session"
        amount = record.get("amount") or 0
        currency = (record.get("currency") or "usd").upper()
        cust_name = record.get("customer_name") or record.get("metadata", {}).get("customer_name") or "(not provided)"
        cust_email = record.get("customer_email") or record.get("metadata", {}).get("customer_email") or "(not provided)"
        notes = record.get("notes") or record.get("metadata", {}).get("notes") or "(none)"
        sess = record.get("session_id", "")
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
        kwargs = {
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
    """Idempotently finalize a transaction. Sends notification email on first success."""
    rec = await db.payment_transactions.find_one({"session_id": session_id})
    if not rec:
        logger.warning("finalize: unknown session_id=%s (%s)", session_id, source)
        return

    update = {"payment_status": payment_status, "status": status_val, "updated_at": now_iso()}

    already_emailed = bool(rec.get("email_sent"))
    is_now_paid = payment_status == "paid"

    if is_now_paid and not already_emailed:
        err = _send_purchase_email(rec)
        if err is None:
            update["email_sent"] = True
            update["email_error"] = None
        else:
            update["email_error"] = err

    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})


@api.get("/billing/status/{session_id}")
async def billing_status(session_id: str, request: Request):
    stripe = _make_stripe(request)
    try:
        status_resp: CheckoutStatusResponse = await stripe.get_checkout_status(session_id)
    except Exception as exc:
        logger.exception("stripe get_checkout_status failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc}")

    await _finalize_paid_session(session_id, status_resp.payment_status, status_resp.status, source="polling")

    return {
        "session_id": session_id,
        "status": status_resp.status,
        "payment_status": status_resp.payment_status,
        "amount_total": status_resp.amount_total,
        "currency": status_resp.currency,
    }


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    stripe = _make_stripe(request)
    try:
        evt = await stripe.handle_webhook(body, sig)
    except Exception as exc:
        logger.exception("stripe webhook verify failed")
        raise HTTPException(status_code=400, detail=f"Webhook error: {exc}")

    if evt.session_id:
        await _finalize_paid_session(
            evt.session_id,
            evt.payment_status or "unknown",
            "complete" if evt.payment_status == "paid" else (evt.event_type or "event"),
            source=f"webhook:{evt.event_type}",
        )
    return {"received": True}


# Mount router
app.include_router(api)


@app.on_event("shutdown")
async def shutdown_db():
    client.close()
