# Spartan Coaching - Test Credentials & Endpoints

## Overview
React Native / Expo iOS mobile app (Spartan Coaching - hospice sales coaching).
- Backend: FastAPI on port 8001 (routes prefixed `/api`)
- Frontend: Expo Web on port 3000
- DB: MongoDB
- Public URL: https://2a674369-c31a-4a86-a0c2-5398e9495a35.preview.emergentagent.com

## No User Authentication
This MVP does not require user login. All endpoints are public.
- Drill streak tracking uses a per-device UUID stored in AsyncStorage (no PII).

## Integrations Used
- OpenAI GPT-4o / GPT-4o-mini via Emergent LLM key (chat, ask, objection, playbook, roleplay, roleplay feedback)
- Resend for contact form email — sends to `nick@spartanhospicecoaching.com`

## Key API Endpoints (use REACT_APP_BACKEND_URL prefix + /api)
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

## Sample Test Inputs
- Contact test: {"name":"QA Tester","email":"qa@example.com","message":"Testing the iOS app contact form"}
- Ask test: {"question":"What is the FAST scale?"}
- Roleplay scenarioId values: cold_call_snf, physician_objection, family_consultation, hospital_discharge, assisted_living_admin, competitor_territory

## Frontend Notes
- Expo Web has lazy route bundling: first navigation to a route compiles it (~5-15s).
  Once warm, subsequent loads are instant.
- All key interactive elements have `data-testid` attributes (kebab-case).
