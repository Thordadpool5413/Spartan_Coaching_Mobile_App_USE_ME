# Spartan Coaching App

iOS coaching app for hospice sales professionals. Built with Expo SDK 56 (React Native) and a FastAPI backend on PostgreSQL.

## Project structure

```
frontend/   — Expo/React Native app (expo-router, TypeScript)
backend/    — FastAPI server (Python, PostgreSQL, OpenAI, Stripe, Resend)
proxy.js    — Dev proxy: port 5000 → Metro port 3000
```

## Development

### Start both servers
Two workflows run in this Replit environment:
- **Start Backend** — `cd backend && uvicorn server:app --host 0.0.0.0 --port 8000 --reload`
- **Start application** — `node proxy.js & cd frontend && npm start`

### Environment variables
| Variable | Where set | Purpose |
|---|---|---|
| `DATABASE_URL` | Replit secret | PostgreSQL connection |
| `OPENAI_API_KEY` | Replit secret | AI coaching endpoints |
| `STRIPE_API_KEY` | Replit secret | Payment checkout |
| `STRIPE_WEBHOOK_SECRET` | Replit secret | Webhook signature verification |
| `RESEND_API_KEY` | Replit secret | Transactional email |
| `ADMIN_TOKEN` | Replit shared env | Admin API access — **change from default before production** |
| `EXPO_PUBLIC_BACKEND_URL` | Replit shared env | Backend URL injected at build time |

### Key config files
- `frontend/app.json` — Expo project config (bundle ID, splash, iOS/Android settings)
- `frontend/app.config.js` — Dynamic config; injects `EXPO_PUBLIC_BACKEND_URL` as `extra.backendUrl`
- `frontend/eas.json` — EAS Build profiles and Apple submit credentials
- `frontend/lib/api.ts` — Backend URL resolved via `Constants.expoConfig.extra.backendUrl`

## Building for TestFlight

### Prerequisites
- Apple Developer account ($99/yr) with an app record created in App Store Connect
- EAS CLI installed: `npm install -g eas-cli` then `eas login`

### 1. Fill in Apple credentials in `frontend/eas.json`
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your@apple-id.com",
      "ascAppId": "1234567890",
      "appleTeamId": "ABCDE12345"
    }
  }
}
```
- **appleId** — your Apple ID email
- **ascAppId** — numeric App Store Connect App ID (found in App Store Connect → App → App Information)
- **appleTeamId** — 10-character team ID from developer.apple.com → Membership

### 2. Set the production backend URL
Make sure `EXPO_PUBLIC_BACKEND_URL` points to your stable production backend (not the Replit preview URL):
```
EXPO_PUBLIC_BACKEND_URL=https://api.spartanhospicecoaching.com
```

### 3. Build
```bash
cd frontend
eas build --platform ios --profile production
```
EAS builds in the cloud (~15-30 min). You'll get an email when it's done.

### 4. Submit to TestFlight
```bash
eas submit --platform ios --profile production
```
Or submit the latest completed build:
```bash
eas submit --platform ios --latest
```

### 5. Add testers
In App Store Connect → your app → TestFlight tab, add internal or external testers.

### Privacy policy & Terms of Service requirement
The App Store requires a publicly accessible privacy policy URL and optionally a Terms of Use URL. The app links to:
```
https://spartanhospicecoaching.com/privacy   ← Privacy Policy (required)
https://spartanhospicecoaching.com/terms     ← Terms of Service (App Store Connect "Terms of Use" field)
```
**You must host both pages at those URLs before App Store review.** The in-app Legal screen (`frontend/app/legal.tsx`) already contains the full policy text you can use.

In App Store Connect → your app → App Information, enter the Terms of Use URL in the **"Terms of Use URL"** field alongside the Privacy Policy URL.

## Production checklist

- [ ] Replace `ADMIN_TOKEN` with a strong random secret (currently defaults to `spartan-admin`)
- [ ] Host privacy policy at `https://spartanhospicecoaching.com/privacy`
- [ ] Host Terms of Service at `https://spartanhospicecoaching.com/terms`
- [ ] Enter Terms of Service URL in App Store Connect → App Information → "Terms of Use URL" field
- [ ] Point `EXPO_PUBLIC_BACKEND_URL` to a stable production backend URL
- [ ] Verify Resend sending domain (`spartanhospicecoaching.com`) in the Resend dashboard
- [ ] Fill in Apple credentials in `frontend/eas.json`
- [ ] Create the App Store Connect app record before running `eas submit`
- [ ] Prepare App Store screenshots (6.5" iPhone + iPad if supporting tablet)
- [ ] Confirm `app.json` `version: "1.0.0"` before first build

## Tech stack

| Layer | Tech |
|---|---|
| Mobile | Expo SDK 56, React Native, expo-router v4 |
| Backend | FastAPI, uvicorn, asyncpg / SQLAlchemy |
| Database | PostgreSQL (Replit built-in) |
| AI | OpenAI GPT-4o (chat, roleplay, objection handling, playbook, eligibility) |
| Payments | Stripe Checkout + webhooks |
| Email | Resend |
| Push | expo-notifications (APNs) |
| Auth | Deep link scheme `spartan://` for post-payment return |

## User preferences

- Dark mode only (`userInterfaceStyle: "dark"` enforced in app)
- No admin tab in the bottom nav
- Rate limiting is per-device (deviceId header) across all AI endpoints
