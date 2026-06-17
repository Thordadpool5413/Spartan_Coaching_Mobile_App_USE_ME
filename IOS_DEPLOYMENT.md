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
- `RESEND_API_KEY` — Resend API key
- `RESEND_FROM_EMAIL=noreply@spartanhospicecoaching.com` (after domain verification)
- `RESEND_FROM_NAME=Spartan Coaching`
- `CONTACT_EMAIL=nick@spartanhospicecoaching.com`
- `BETA_UNLOCK_ENABLED=1` — keep admin features open for TestFlight beta users
- `ADMIN_TOKEN` — optional fallback if you later disable beta unlock; keep it server-side only
- `STRIPE_PRO_PRICE_ID` — Stripe price ID for the Pro subscription
- `STRIPE_TEAM_5_PRICE_ID` — Stripe price ID for the 5-seat team subscription
- `STRIPE_TEAM_10_PRICE_ID` — Stripe price ID for the 10-seat team subscription
- `CORS_ALLOWED_ORIGINS` — comma-separated list of origins, e.g. `https://app.spartanhospicecoaching.com,https://admin.spartanhospicecoaching.com`

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
- [x] Client no longer bundles the admin token; beta unlock is controlled by `BETA_UNLOCK_ENABLED`
- [x] CORS restricted via `CORS_ALLOWED_ORIGINS` env var — currently set to the preview domain + localhost. Update to your production domain(s) before launch.
- [x] Resend `from` address is configurable via `RESEND_FROM_EMAIL` / `RESEND_FROM_NAME` env vars (currently `onboarding@resend.dev` — see Resend Domain Verification below).
- [ ] Migrate MongoDB to Atlas (see MongoDB Atlas Migration below)
- [ ] Verify Resend sending domain (see Resend Domain Verification below)
- [ ] Add Sentry or similar error tracking in `app/_layout.tsx`
- [ ] Set `expo-application` version to track installs
- [ ] Submit App Privacy answers truthfully (this app does collect optional email/phone via contact form)

## MongoDB Atlas Migration

The local MongoDB instance in this preview environment is fine for testing but not for production. Atlas gives you a managed, replicated MongoDB cluster with free 512 MB tier.

### Steps
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a new project → **Build a Database** → **M0 Free tier**
3. Choose AWS, your nearest region
4. Click **Create**. Wait ~3 minutes for the cluster to provision.
5. Under **Security → Database Access**, create a user:
   - Username: `spartan_app`
   - Auth: SCRAM with a strong password (save it)
   - Built-in role: `Read and write to any database`
6. Under **Security → Network Access**, click **Add IP Address**:
   - For development: `0.0.0.0/0` (any IP)
   - For production: restrict to your backend host's static IP
7. Under **Database → Connect → Drivers**, copy the connection string. It looks like:
   ```
   mongodb+srv://spartan_app:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
8. On your production backend host, set:
   ```
   MONGO_URL=mongodb+srv://spartan_app:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=SpartanCoaching
   DB_NAME=spartan_coaching
   ```
9. **No code change required** — the FastAPI backend already reads from `MONGO_URL`/`DB_NAME` env vars.
10. (Optional) Seed test data by manually running a contact form submission through the live app, then verify in Atlas → Database → Collections that you see `contacts`, `eligibility_checks`, `drill_completions`, `chat_logs`.

## Resend Domain Verification

Currently emails are sent from `onboarding@resend.dev`. To send from your own domain (so emails don't land in spam):

### Steps
1. Log in to https://resend.com → **Domains** → **Add Domain**
2. Enter `spartanhospicecoaching.com` (or whichever sending domain Nick controls)
3. Resend will give you 3 DNS records to add to your domain registrar:
   - 1 SPF TXT record (e.g., `send.spartanhospicecoaching.com → v=spf1 include:_spf.resend.com ~all`)
   - 1 DKIM TXT record
   - 1 DMARC TXT record (optional but recommended)
4. Add those records to your DNS provider (Cloudflare/GoDaddy/Namecheap/etc.)
5. Click **Verify Domain** in Resend. Verification can take 15 minutes to 24 hours depending on DNS propagation.
6. Once verified, update your backend env vars:
   ```
   RESEND_FROM_EMAIL=noreply@spartanhospicecoaching.com
   RESEND_FROM_NAME=Spartan Coaching
   ```
7. Restart the backend. New contact-form emails will come from your verified domain.
8. (Optional) Add a `reply_to` address that goes directly to Nick's inbox — the code already sets `reply_to` to the submitter's email so Nick can reply directly to leads.
