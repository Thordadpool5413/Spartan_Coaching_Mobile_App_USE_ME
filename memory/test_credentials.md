# Spartan Coaching - Test Credentials & Endpoints

## Overview
React Native / Expo iOS mobile app (Spartan Coaching - hospice sales coaching).
- Backend: FastAPI on port 8001 (routes prefixed `/api`)
- Frontend: Expo Web on port 3000
- DB: MongoDB
- Public URL: https://2a674369-c31a-4a86-a0c2-5398e9495a35.preview.emergentagent.com

## No User Authentication for End Users
This MVP does not require end-user login. All public-facing endpoints are open.
- Drill streak tracking uses a per-device UUID stored in AsyncStorage (no PII).

## Admin Access
- Token: **JvAvVYHsxECbQDWzXttacXQAKcRlUrMnGkx3--UTS1o** (rotated; configured in `/app/backend/.env` as `ADMIN_TOKEN`)
- Old token `spartan-admin-2026` is now correctly rejected (returns 403)
- Admin endpoints require `Authorization: Bearer <token>` header
- Admin UI: open `/admin` in the app — token persists in AsyncStorage as `spartan_admin_token`

## CORS
- Restricted via `CORS_ALLOWED_ORIGINS` env var (comma-separated list)
- Currently allows: preview URL + localhost:3000 + localhost:8081
- Note: the Kubernetes ingress at the public preview URL overrides ACAO with `*` — that's expected for the preview environment. The FastAPI middleware enforces correctly when hit directly at localhost:8001 (and will be the gatekeeper in production deployments).

## Integrations Used
- OpenAI GPT-4o / GPT-4o-mini via Emergent LLM key (chat, ask, objection, playbook, roleplay, roleplay feedback, eligibility)
- Resend for contact form email — sends to `CONTACT_EMAIL` (nick@spartanhospicecoaching.com)
  - Configurable via `RESEND_FROM_EMAIL` / `RESEND_FROM_NAME` env vars (default sandbox: onboarding@resend.dev)
- `expo-notifications` for daily drill reminders (native iOS; web fallback)

## Key API Endpoints (use REACT_APP_BACKEND_URL prefix + /api)
**Public**
- GET  /api/health
- POST /api/ask  body: {question}
- POST /api/chat  body: {prompt, conversationHistory}
- POST /api/tools/objection  body: {objection, context?}
- POST /api/tools/playbook  body: {scenario, referralSourceType?, goal?}
- GET  /api/roleplay/scenarios
- POST /api/roleplay/turn  body: {scenarioId, userMessage, history}
- POST /api/roleplay/feedback  body: {scenarioId, transcript[]}
- GET  /api/drills/today
- GET  /api/drills/all
- POST /api/drills/complete  body: {deviceId, drillIndex, dateKey}
- GET  /api/drills/stats/{device_id}
- GET  /api/knowledge?q=&category=
- GET  /api/method
- POST /api/contact  body: {name, email, phone?, company?, serviceInterest?, message}
- POST /api/eligibility/assess  body: {diagnosis, age?, indicators, functionalScale?, functionalScore?, recentEvents?, notes?}

**Admin (Bearer token required)**
- GET /api/admin/overview
- GET /api/admin/contacts?limit=50
- GET /api/admin/eligibility?limit=100

## Sample Test Inputs
- Contact: {"name":"QA Tester","email":"qa@example.com","message":"Testing the iOS app contact form"}
- Ask: {"question":"What is the FAST scale?"}
- Eligibility: {"diagnosis":"Dementia / Alzheimer's","age":86,"indicators":["Weight loss > 10% in 6 months","Recurrent infections (UTI, pneumonia, sepsis)"],"functionalScale":"FAST","functionalScore":"7A"}
- Roleplay scenarioId: cold_call_snf, physician_objection, family_consultation, hospital_discharge, assisted_living_admin, competitor_territory

## Frontend Notes
- Expo Web has lazy route bundling: first navigation to a route compiles it (~5-15s). Once warm, subsequent loads are instant.
- All key interactive elements have `data-testid` attributes (kebab-case).
- AsyncStorage keys: `spartan_device_id`, `spartan_admin_token`, `spartan_notif_enabled`, `spartan_notif_hour`, `spartan_notif_id`
- Logo: `/app/frontend/assets/images/spartan-logo.png` (grunge stamp "SPARTAN COACHING", 2048×2048 PNG)
