# DecyfoGate for Schools — Royal Kingdom Group of Schools demo

A multi-role school management platform, demoed against a fictional but
realistic tenant: **Royal Kingdom Group of Schools** (Royal Kingdom Nursery
and Primary School + Royal Kingdom College). See the original build brief
for full product context.

This is a client/server monorepo (Turborepo + pnpm workspaces) so the same
API can serve a Next.js web app and an Expo (React Native) mobile app.
**The backend (Phase 1), seed data (Phase 2), and web app (Phase 3) exist
so far** — see "Status" below. The mobile app and marketing polish pass
have not been built yet.

## Layout

```
apps/
  api/                REST API (Express + TypeScript + Prisma/PostgreSQL)
  web/                Next.js app: public marketing site + authenticated dashboards
packages/
  shared-types/       Domain types/DTOs shared across api/web/mobile
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
```

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
4. ⬜ Mobile app (Expo) — not started
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
