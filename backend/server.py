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

from fastapi import FastAPI, APIRouter, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient

import resend
from emergentintegrations.llm.chat import LlmChat, UserMessage

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
CONTACT_EMAIL = os.environ.get("CONTACT_EMAIL", "nick@spartanhospicecoaching.com")
LLM_MODEL = os.environ.get("LLM_MODEL", "gpt-4o")
LLM_MODEL_FAST = os.environ.get("LLM_MODEL_FAST", "gpt-4o-mini")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Spartan Coaching API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def llm_complete(system: str, user_text: str, model: str = LLM_MODEL_FAST, history: Optional[List[dict]] = None) -> str:
    """Non-streaming completion. history is list of {role: 'user'|'model', content: str}."""
    session_id = str(uuid.uuid4())
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system).with_model("openai", model)
    # Pre-load history by sending past messages (workaround since LlmChat manages session memory in-process)
    if history:
        for msg in history:
            role = msg.get("role")
            content = (msg.get("content") or "").strip()
            if not content:
                continue
            if role == "user":
                # Send and discard - but this would also generate responses; better skip and embed history into prompt
                pass
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
    reply = await chat.send_message(UserMessage(text=composed))
    return reply if isinstance(reply, str) else str(reply)


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


# ---------- Health ----------
@api.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", timestamp=now_iso())


@api.get("/")
async def root():
    return {"service": "Spartan Coaching API", "status": "ok"}


# ---------- AI: Chat ----------
@api.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
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
async def ask_endpoint(req: AskRequest):
    prompt = f"A hospice growth professional asks: {req.question}\n\nGive a clear, concrete, field-ready answer (300-500 words). Use bullets or numbered steps where they help."
    try:
        text = await llm_complete(SPARTAN_SYSTEM_INSTRUCTION, prompt, model=LLM_MODEL_FAST)
    except Exception as exc:
        logger.exception("ask failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    return ChatResponse(response=text)


# ---------- AI: Objection Handler ----------
@api.post("/tools/objection", response_model=ChatResponse)
async def objection_endpoint(req: ObjectionRequest):
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
async def playbook_endpoint(req: PlaybookRequest):
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
async def roleplay_turn(req: RoleplayRequest):
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
    cursor = db.drill_completions.find({"deviceId": device_id}).sort("dateKey", -1)
    completions = []
    async for doc in cursor:
        completions.append({"dateKey": doc["dateKey"], "drillIndex": doc.get("drillIndex")})
    # Compute streak
    today = datetime.now(timezone.utc).date()
    completion_dates = {datetime.strptime(c["dateKey"], "%Y-%m-%d").date() for c in completions}
    streak = 0
    cursor_date = today
    if today in completion_dates:
        while cursor_date in completion_dates:
            streak += 1
            cursor_date = cursor_date.replace(day=cursor_date.day) if False else cursor_date
            from datetime import timedelta
            cursor_date = cursor_date - timedelta(days=1)
    else:
        # Allow yesterday-only streak too
        from datetime import timedelta
        cursor_date = today - timedelta(days=1)
        while cursor_date in completion_dates:
            streak += 1
            cursor_date = cursor_date - timedelta(days=1)
    # Heatmap: last 90 days
    from datetime import timedelta
    heatmap = []
    for i in range(89, -1, -1):
        d = today - timedelta(days=i)
        heatmap.append({"date": d.isoformat(), "done": d in completion_dates})
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
                "from": "Spartan Coaching App <onboarding@resend.dev>",
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


# Mount router
app.include_router(api)


@app.on_event("shutdown")
async def shutdown_db():
    client.close()
