# DecyfoGate for Schools — Royal Kingdom Group of Schools demo

A multi-role school management platform, demoed against a fictional but
realistic tenant: **Royal Kingdom Group of Schools** (Royal Kingdom Nursery
and Primary School + Royal Kingdom College). See the original build brief
for full product context.

This is a client/server monorepo (Turborepo + pnpm workspaces) so the same
API serves a Next.js web app and an Expo (React Native) mobile app.
**The backend (Phase 1), seed data (Phase 2), web app (Phase 3), and
mobile app (Phase 4) exist so far** — see "Status" below. Only the polish
pass (Phase 6) has not been built yet.

## Layout

```
apps/
  api/                REST API (Express + TypeScript + Prisma/PostgreSQL)
  web/                Next.js app: public marketing site + authenticated dashboards
  mobile/             Expo (React Native) app: Form Teacher + Subject Teacher screens
packages/
  shared-types/       Domain types/DTOs shared across api/web/mobile
  api-client/         REST client (fetch wrapper + typed calls) shared by web and mobile
```

Modules inside `apps/api/src/modules` map to the future microservice
boundaries called out in the brief: `identity`, `directory`, `attendance`,
`notifications`, `billing`.

## Getting started

Prerequisites: Node 20+, pnpm, a PostgreSQL 14+ database.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # then set DATABASE_URL / JWT_SECRET
pnpm db:migrate                          # applies Prisma migrations
pnpm db:seed                             # generates the full Royal Kingdom dataset
pnpm --filter @decyfogate/api dev        # starts the API on :4000
cp apps/web/.env.local.example apps/web/.env.local
pnpm --filter @decyfogate/web dev        # starts the web app on :3000

cp apps/mobile/.env.example apps/mobile/.env
pnpm --filter @decyfogate/mobile start   # Expo Dev Tools; press w/a/i for web/Android/iOS
```

`EXPO_PUBLIC_API_URL` defaults to `http://localhost:4000`, which works for
the web target and the iOS Simulator on the same machine. A physical
device or Android emulator needs your machine's LAN IP instead (or run
`expo start --tunnel`), since "localhost" on-device means the device
itself, not your computer.

`pnpm db:seed` is idempotent and re-runnable — it wipes and regenerates the
whole demo dataset from a fixed random seed, so re-running it always
produces the same simulated school.

Every seeded account (Group Admin, School Admins, Form Teachers, Subject
Teachers, DecyfoTech internal roles) shares the password
`Decyfogate@2026` — printed again at the end of the seed run. This is only
safe because the data is entirely simulated demo data.

## What's real vs. simulated

- **Real**: Postgres schema, JWT auth, role-based authorization, attendance
  marking (daily register + subject-scoped), attendance reporting,
  low-attendance flagging, the not-yet-arrived flag, and the queued
  notification pipeline's state machine (QUEUED → SENT → DELIVERED/FAILED).
- **Simulated**: actual SMS/WhatsApp delivery. There is no Termii/Twilio/
  WhatsApp Business API key wired up (per the brief, this is optional for
  the demo) — `NotificationLog` rows are created and then flipped through
  realistic delivery states on a short timer instead of hitting a real
  provider.
- **Stubbed**: billing/subscription is a read-only record with no payment
  processing.

## Status against the brief's delivery plan

1. ✅ Schema + API skeleton
2. ✅ Seed script for the full Royal Kingdom Group dataset
3. ✅ Web app (Next.js) — marketing landing page, sign-in portal, School
   Admin / Form Teacher / Subject Teacher dashboards (see below)
4. ✅ Mobile app (Expo) — Form Teacher and Subject Teacher flows (see below)
5. ✅ Marketing landing page — built as part of Phase 3 (see below)
6. ⬜ Polish pass — not started

### Phase 3 notes

- Marketing site and sign-in portal live in the same Next.js app, as a
  public route group vs. an authenticated `(app)` route group, per the
  brief's suggested default.
- Route protection is client-side (a `RequireAuth` wrapper reading a React
  auth context backed by `localStorage`), not Next's `proxy.ts` — the
  backend is a separate REST API using bearer JWTs rather than
  Next-managed sessions, so there is no server-side session for a proxy to
  inspect without extra plumbing. Every real authorization check still
  happens on the API.
- School Admin dashboard covers class structure, staff, single-student
  enrollment, the attendance report, low-attendance flags, and broadcast
  messaging. **Bulk CSV import was scoped out of this phase** (single
  enrollment only) to keep Phase 3 to a reviewable size — flagged
  explicitly rather than silently skipped.
- Group Admin reuses the School Admin dashboard with a school switcher and
  the option to broadcast to the whole group; there is no separate
  dedicated Group Admin screen yet.
- The "notifications sent" panel polls the API every 2.5s so a demo
  audience visibly watches QUEUED → SENT → DELIVERED happen after a tap,
  which is the moment the brief calls out as needing to look real.
- Verified by hand in a real Chromium browser (not just typechecked):
  login for all three web-facing roles, every School Admin tab, live
  attendance marking with the notification pipeline resolving to
  DELIVERED, subject-teacher class switching, student enrollment, and
  sending a broadcast.

### Phase 4 notes

- **Expo Router**, not React Navigation — file-based routing that mirrors
  the mental model of the Next.js App Router already used for web, so the
  two clients read the same way even though the code isn't shared.
- **Native push notifications are out of scope**, not deferred to Phase 6.
  The brief's notification requirement is guardian-facing SMS/WhatsApp,
  never an OS-level push to the teacher's own device — that feature
  doesn't exist anywhere in the brief, so there was nothing to defer. The
  mobile app surfaces the same "notifications sent" polling panel as web.
- Per the brief ("School Admin dashboard can remain web-only for v1"),
  **only Form Teacher and Subject Teacher have mobile screens**. A School
  Admin or Group Admin account signing in on mobile sees an explicit
  message pointing them to the web app rather than a broken or empty
  screen.
- **Shared, not duplicated**: `packages/api-client` holds the fetch
  wrapper (`ApiError`, `apiRequest`) and a typed `DecyfogateApiClient`
  class with the specific calls both teacher UIs need (login, roster,
  today's attendance, mark attendance, notification logs). Both
  `apps/web` and `apps/mobile` depend on it — `apps/web/src/lib/
  api-client.ts` is now a two-line wrapper around the shared package
  rather than its own copy. Auth *context* (session storage, React
  provider) stays platform-specific by design: web persists to
  `localStorage` synchronously, mobile persists to `AsyncStorage`
  asynchronously, and forcing one shape onto both would either lose the
  platform's idiomatic storage API or add an abstraction layer not
  justified at this scale.
- Session persistence (AsyncStorage), roster loading, one-tap marking, and
  the live notification panel all confirmed working identically to web.
- No work done on Section 8 (the deferred secondary end-of-day digest) --
  note that section's text wasn't in the brief content shared for this
  build, so this is a blind compliance with the instruction not to touch
  it, not a decision I made with visibility into what it specifies.

**Verified for real, not just typechecked**: ran `expo start --web`
(the only rigorous option in this sandboxed container -- no iOS/Android
simulator or physical device is available here) and drove it with a real
Chromium browser via Playwright: login as both Form Teacher and Subject
Teacher, marked attendance and watched the notification panel progress to
DELIVERED, switched between linked class+subject on the Subject Teacher
screen, reloaded to confirm the session survives via AsyncStorage, and
signed out. Zero console errors throughout. This exercises the same
React Native component tree, navigation, and API integration that would
run on-device; it does not exercise iOS/Android-only native modules,
so a real device/simulator pass is still worth doing before shipping.
