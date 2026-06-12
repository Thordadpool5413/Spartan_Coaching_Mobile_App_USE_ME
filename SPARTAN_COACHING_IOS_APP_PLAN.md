# Spartan Coaching iOS App Plan

## Summary
- Build a native Expo/React Native iPhone app in the Replit workspace, backed by the existing Express API.
- Keep the current web app as the admin/content system of record; the mobile app is the end-user coach experience.
- Ship in three passes: mobile foundation, high-value user flows, then hardening and device validation.

## Key Changes
- Create a mobile app shell with bottom tabs, safe-area handling, shared theme tokens, typed API client, and local persistence for drafts, bookmarks, recent activity, and streaks.
- Organize the mobile IA around user value instead of the desktop site map: Today, Coach, Practice, Library, and Contact.
- Port the highest-value flows first: daily drill, ask Spartan AI, playbooks/objections/research, roleplay, assessments, resources/knowledge base, and contact/book-call.
- Keep admin, article management, and other content-management screens web-only; do not port the browser secret admin flow into iOS v1.
- Replace print-style PDF behavior with native share/export flows and iPhone-friendly results screens.
- Harden the backend surfaces the app relies on: rate-limit public submits, normalize error responses, keep secrets server-side, and avoid any client-side AI/email credentials.
- Reuse the existing public routes for content and AI; only add new APIs if we later choose cross-device sync or account-based persistence.

## Test Plan
- Verify server build and checks still pass.
- Run the mobile app in Replit preview and on an iPhone-sized simulator/device path.
- Smoke-test the core journeys end to end: onboarding, drill completion, AI chat, roleplay, assessment submit, contact submit, and export/share.
- Validate offline/resume behavior by refreshing mid-flow, reopening the app, and confirming saved drafts and recent state restore correctly.
- Confirm mobile cannot reach admin-only paths and that repeated public submissions are throttled.

## Assumptions
- I’m assuming the first release target is TestFlight-ready, not App Store-ready on day one.
- I’m assuming we keep the no-mandatory-login posture for v1 and use local persistence first instead of forcing accounts.
- I’m assuming the current web app stays live and the iOS app is a new mobile client that shares the same backend.
