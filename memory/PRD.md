# Spartan Coaching - iOS Mobile App PRD

## Original Problem Statement
Build a mobile app for iOS from the git repo "Spartan Coaching" (https://github.com/Thordadpool5413/SpartanCoaching).
User chose React Native / Expo conversion, all integrations needed, follow the build from the repo.

## User Choices
- Framework: React Native / Expo (Expo Web for preview, ships to iOS via `expo run:ios`)
- AI: Emergent LLM Key (OpenAI GPT-4o / GPT-4o-mini) — confirmed by user
- Email: Resend (API key provided by user)
- Authentication: None (public app)

## Architecture
- **Backend**: FastAPI on port 8001, MongoDB (`spartan_coaching` DB)
- **Frontend**: Expo Router v6 (file-based routing) + React Native + React Native Web, served on port 3000 via `expo start --web`
- **AI Integration**: `emergentintegrations.llm.chat.LlmChat` with automatic fallback from `gpt-4o` to `gpt-4o-mini` on budget/rate errors
- **Email**: Resend Python SDK
- **Storage**: MongoDB collections — `contacts`, `drill_completions`, `chat_logs`

## User Personas
- **Hospice Liaison / Sales Rep**: Uses AI tools daily to prep visits, sharpen messaging, handle objections, practice tough conversations
- **Sales Manager / Director**: Sees Method framework, services, contacts for coaching engagement
- **Hospice Executive**: Browses about/services/manifesto/compliance for vetting

## Implemented (Jan 2026)
- 5-tab bottom navigation: Home, Method, AI Tools, Learn, More
- **Home**: Hero with badge, Spartan logo, gradient title, primary CTAs, Today's drill card with streak, **Hospice Eligibility Quick Check lead-magnet card**, 6 tool cards grid, "The Real Problem" section, trust bullets, contact CTA
- **NEW: Hospice Eligibility Quick Check** (POST /api/eligibility/assess): 4-step guided clinical questionnaire (diagnosis → decline indicators → functional scale FAST/PPS/NYHA → recent events) that produces a shareable hospice-readiness summary aligned to Medicare LCDs. Verdict colored gradient card (Likely/Possible/Not Yet). Share to native share sheet, Talk to Nick CTA, restart. PII-free anonymous logging.
- **NEW: Admin Dashboard** (`/admin`, token-protected via `ADMIN_TOKEN` env var): Token lock screen + 3 tabs — Overview (4 stat cards + verdict breakdown bar chart + top diagnoses list), Contacts (recent submissions with email-sent badge), Eligibility (recent checks with verdict color dots). AsyncStorage persistence + logout.
- **NEW: Notifications & Settings** (`/settings`): Daily Drill Reminder toggle wired to `expo-notifications` with 9 time presets (6am/7am/7:30/8am/8:30/9am/12pm/5pm/8pm). Persists in AsyncStorage. Web fallback (uses Notification API; shows helper card if blocked in browser). On native iOS, schedules a repeating daily local notification. Admin access link.
- **NEW: EAS Build config** (`/app/frontend/eas.json`) and **TestFlight deployment guide** (`/app/IOS_DEPLOYMENT.md`): production-ready iOS app.json (bundleIdentifier `com.spartancoaching.app`, push notification entitlements, encryption exemption), 3 EAS build profiles (development/preview/production), and a 6-step submission guide
- **Method**: Mission card, 3 expandable pillars (Discipline/Empathy/Strategy), 4 sequential subjects (Discovery/Connecting/Guiding/Commitment) with purpose/execution/measurable output, 5 fundamentals, 6 ethics points
- **AI Tools tab**: List of all 6 AI tools
- **Learn tab**: Knowledge Base/Drills/Role-Play tiles + 4 article previews
- **More tab**: Nav to About/Services/Manifesto/Compliance/FAQ + Contact form
- **Ask a Hospice Expert** (POST /api/ask): GPT-4o-mini, suggestion chips auto-submit, markdown rendered answer
- **Coach Chat** (POST /api/chat): Multi-turn conversational coaching using GPT-4o
- **Objection Handler** (POST /api/tools/objection): Returns 3 angles (clinical/empathetic/practical)
- **Playbook Generator** (POST /api/tools/playbook): Pre-visit playbook with referral source type
- **Role-Play Practice** (POST /api/roleplay/turn + /api/roleplay/feedback): 6 in-character AI scenarios with end-of-session scoring (1-10) and Spartan Method coaching feedback
- **Daily Drills** (GET /api/drills/today, POST /api/drills/complete): 40 drills across 9 categories, streak tracking, 90-day heatmap, per-device persistence
- **Knowledge Base** (GET /api/knowledge): 40 entries with search and category filter
- **About**: Founder bio with Nick Lynch photo, Spartan Mission, Stakes, Values, LinkedIn link
- **Services**: 4 tiers (Individual, Leadership, Corporate, Technology) with pricing and bullets
- **Manifesto**: 7 Spartan principles in Roman numerals
- **Compliance**: 5 commitments + 4 boundary cards
- **FAQ**: 8 expandable questions
- **Contact form**: Persists to Mongo + sends email via Resend to nick@spartanhospicecoaching.com

## Backend Endpoints (`/api/*`)
- `GET /health`, `GET /method`
- `POST /ask`, `POST /chat`, `POST /tools/objection`, `POST /tools/playbook`
- `GET /roleplay/scenarios`, `POST /roleplay/turn`, `POST /roleplay/feedback`
- `GET /drills/today`, `GET /drills/all`, `POST /drills/complete`, `GET /drills/stats/{device_id}`
- `GET /knowledge?q=&category=`
- `POST /contact`

## Testing Status (Jan 2026)
- Backend: 100% (25/25 tests, including 5 new Eligibility tests) - automated via testing_agent_v3
- Frontend: 100% (24+18 = 42 scenarios) - all flows verified end-to-end via Playwright

## P0/P1/P2 Backlog (deferred from Phase 1)
- **P1** Admin panel (article CMS, contact viewer, role-play transcripts viewer)
- **P1** Native iOS build with `expo run:ios` + TestFlight setup
- **P1** Push notifications for daily drill reminders
- **P2** Articles full CMS (currently article previews only)
- **P2** Podcasts list
- **P2** PDF Training Resources library
- **P2** Branch Profitability calculator
- **P2** Candidate Assessment tool with shareable invite links
- **P2** Legal e-signature suite
- **P2** ROI & Activity calculators (financial)
- **P2** LinkedIn social proof widget
- **P3** Visitor analytics dashboard

## Next Tasks
- Submit to TestFlight (steps documented in `/app/IOS_DEPLOYMENT.md`) — requires user's Apple Developer account
- Production hardening: rotate `ADMIN_TOKEN`, restrict CORS, migrate Mongo to Atlas, verify Resend sending domain
- Migrate RN Web `shadow*` style props to `boxShadow`, `props.pointerEvents` to `style.pointerEvents` (3rd-party deprecation cleanup)
