# iOS TestFlight Submission Guide

## What I cannot do from this container
- Build the native iOS bundle (requires Xcode + macOS)
- Sign with your Apple Developer certificates
- Upload to App Store Connect / TestFlight

Those steps require **your Apple Developer account ($99/yr)** and either a Mac with Xcode OR Expo's hosted **EAS Build** service (free tier available).

## What I've prepared for you
- ✅ `app.json` — production-ready iOS config:
  - `bundleIdentifier: com.spartancoaching.app`
  - Push notification entitlements
  - Encryption-exemption declaration
- ✅ `eas.json` — three build profiles (development/preview/production)
- ✅ `expo-notifications` plugin wired up for native push
- ✅ All AI integrations point at the public preview backend via `EXPO_PUBLIC_BACKEND_URL`

## TestFlight in 6 steps

### 1. Install EAS CLI on your Mac/PC
```bash
npm install -g eas-cli
eas login
```

### 2. Initialize EAS for this project
```bash
cd /path/to/spartan-coaching-app
eas init --id <your-eas-project-id>   # or just `eas init`
```
This adds an `extra.eas.projectId` to your `app.json`.

### 3. Update `eas.json` submit credentials
Replace the placeholders in `eas.json` → `submit.production.ios`:
- `appleId` — your Apple ID email
- `appleTeamId` — found in Apple Developer Membership page
- `ascAppId` — App Store Connect App ID (create the app first at https://appstoreconnect.apple.com)

### 4. Build for iOS
```bash
eas build --platform ios --profile production
```
EAS will:
- Generate signing credentials (or use yours)
- Build a `.ipa` file in their cloud
- Email you when done (~15-30 min)

### 5. Submit to TestFlight
```bash
eas submit --platform ios --latest
```

### 6. Add testers in App Store Connect
- Go to https://appstoreconnect.apple.com → your app → TestFlight tab
- Add internal testers (your team) or external testers (beta groups)

## Backend deployment for production
Before going to App Store, decide where the backend lives:

**Option A — Stay on Emergent preview URL** (easiest, current)
- The Expo build already points at the preview URL via `EXPO_PUBLIC_BACKEND_URL`
- Make sure the preview environment is kept running

**Option B — Move backend to a stable production host**
- Deploy `/app/backend` to Render, Fly.io, Railway, or AWS App Runner
- Update `/app/frontend/.env`:
  ```
  EXPO_PUBLIC_BACKEND_URL=https://api.spartancoaching.com
  ```
- Rebuild with `eas build`

## Required environment variables in production
On whichever backend host you choose, set:
- `MONGO_URL` — production MongoDB connection string (e.g., MongoDB Atlas)
- `DB_NAME=spartan_coaching`
- `EMERGENT_LLM_KEY` — for OpenAI access
- `RESEND_API_KEY=re_Mqvb4rvP_NAoADg62xCfqdDvwkXajJwRz`
- `CONTACT_EMAIL=nick@spartanhospicecoaching.com`
- `ADMIN_TOKEN` — pick a strong secret for admin dashboard auth

## Custom App Store assets you'll need
- 1024×1024 App Icon (currently using the Spartan logo at `/app/frontend/assets/images/spartan-logo.png`)
- iPhone screenshots (6.5" + 5.5" Display)
- iPad screenshots (if supporting iPad)
- App Privacy answers (collect: no PII; AI tools, contact form, drill tracking)
- App description, keywords, support URL, marketing URL

## Cost summary
- Apple Developer Program: $99/year (required for TestFlight + App Store)
- EAS Build: Free tier = 30 builds/month; paid plans from $19/month
- Resend: Free tier = 100 emails/day
- MongoDB Atlas: Free tier = 512 MB (enough to start)
- OpenAI: pay-as-you-go via Emergent LLM key

## Production hardening checklist
- [ ] Replace `ADMIN_TOKEN=spartan-admin-2026` with a strong random secret
- [ ] Set `CORS allow_origins` to your real domain(s) instead of `["*"]`
- [ ] Switch MongoDB from local to Atlas with username/password auth
- [ ] Add Resend domain verification (so emails come from `@spartanhospicecoaching.com`, not `onboarding@resend.dev`)
- [ ] Add Sentry or similar error tracking in `app/_layout.tsx`
- [ ] Set `expo-application` version to track installs
- [ ] Submit App Privacy answers truthfully (this app does collect optional email/phone via contact form)
