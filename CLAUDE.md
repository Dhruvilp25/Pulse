# Pulse — Self-Serve Analytics SaaS

## Stack
- Framework: Next.js 16 (App Router, Turbopack default), TypeScript, Tailwind CSS v4
- ORM: Prisma
- Database: PostgreSQL (Railway)
- Queue: Redis + BullMQ (Railway)
- Auth: Clerk
- AI: OpenAI API (NL-to-SQL)
- Charts: Recharts
- Deploy: Vercel (app) + Railway (DB + Redis)

## Project structure
Source lives under `src/` (the scaffold uses a `src` dir; `@/*` → `./src/*`).
- src/app — Next.js app router pages and layouts
- src/app/api — API routes (ingest, stream, query, keys)
- src/proxy.ts — request middleware (see Next.js 16 notes; Clerk runs here)
- src/lib — shared utilities (db client, queue, auth helpers)
- src/components — UI components
- /prisma — schema.prisma and migrations
- /workers — BullMQ worker processes (root, run outside Next)

## Next.js 16 notes (differs from older Next.js)
- `middleware.ts` is renamed to `proxy.ts` (Node.js runtime only, no edge). The
  exported fn is the default export; config.matcher works the same.
- Request APIs are async: `await cookies()`, `await headers()`, and `await auth()`.
- Clerk is v7: `<SignedIn>`/`<SignedOut>` were removed — use
  `<Show when="signed-in">` / `<Show when="signed-out">`. `auth` is imported from
  `@clerk/nextjs/server`, not the root.
- AGENTS.md says to read `node_modules/next/dist/docs/` before writing Next code.

## Database tables
- Project — belongs to a Clerk user, has many ApiKeys and Events
- ApiKey — hashed with bcrypt, only prefix shown to user, scoped to a Project
- Event — name + JSONB properties + timestamp, always scoped by projectId
- Query — saved NL-to-SQL questions and their generated SQL

## Key architecture decisions
- POST /api/ingest writes to Redis queue first, never directly to DB
- BullMQ worker batch flushes events to PostgreSQL every 5 seconds
- Every single DB query must be scoped by projectId — enforced in middleware
- SSE (Server-Sent Events) for dashboard real-time updates, not WebSockets
- NL-to-SQL: AI output is never executed raw — SELECT only whitelist, projectId injected programmatically
- API keys: hash with bcrypt on creation, store hash + prefix, never store plaintext

## Current phase
Phase 1 — Auth + project setup
Phase 2 - Prisma

## What's done
- Step 1: Clerk auth wired up — `src/proxy.ts` (clerkMiddleware, protects
  `/dashboard`), `<ClerkProvider>` + header in `src/app/layout.tsx`, sign-in/
  sign-up catch-all routes, and a protected `src/app/dashboard` page. Keys go in
  `.env.local` (placeholders committed locally; replace with real Clerk keys).
- Step 2a: Prisma 7 set up — `prisma/schema.prisma` (Project, ApiKey, Event,
  Query, all projectId-scoped), client singleton in `src/lib/db.ts`. Prisma 7
  uses the `prisma-client` generator → output to `src/generated/prisma`
  (gitignored, regenerated via `postinstall`), and connects through the
  `@prisma/adapter-pg` driver adapter. Env loads from `.env.local` via
  `prisma.config.ts`.
- Step 2b: first migration applied — `prisma/migrations/<ts>_init` creates the
  four tables on Railway Postgres (verified live). Note: use the **public**
  Railway URL (`*.proxy.rlwy.net`) for `DATABASE_URL`, not the `.internal` host —
  both local dev and Vercel are external to Railway's private network.
- Step 3: folder structure scaffolded — `src/app/api/health/route.ts` (liveness
  endpoint; establishes the route-handler convention), plus `src/components/`
  and `workers/` created with READMEs describing their purpose.

- Phase 2 (started): Projects feature — `src/lib/projects.ts` (list/create,
  scoped by clerkUserId), `createProjectAction` Server Action in
  `src/app/dashboard/actions.ts` (re-checks auth), and `/dashboard` now lists the
  user's projects + a create form.

- Phase 2: API keys per project — `src/lib/api-keys.ts` (generate/hash/verify
  with **bcryptjs** — pure-JS bcrypt, serverless-safe; `pulse_sk_` token stored
  as prefix + bcrypt hash, plaintext shown once), key data fns in
  `src/lib/projects.ts`, and a detail page `src/app/dashboard/projects/[id]` with
  a generate-key form (Server Action + `useActionState` one-time reveal). Added
  `tsx` (dev) for running TS scripts/workers.

- Phase 2: ingest auth + validation (Redis-free) — `authenticateApiKey` in
  `src/lib/projects.ts` (prefix lookup → bcrypt verify → projectId; rejects
  unknown/revoked/invalid), prefix helpers in `src/lib/api-keys.ts`, and pure
  `validateEvent` in `src/lib/events.ts`. Verified against the live DB.

- Phase 2: ingest producer — `POST /api/ingest` (`src/app/api/ingest/route.ts`)
  authenticates by API key, validates, and enqueues to Redis via
  `src/lib/queue.ts` (BullMQ "events" queue). Returns 202; never writes the DB
  directly. ioredis is **pinned to 5.10.1** to match bullmq's exact dep (avoids a
  dual-copy type clash). Verified against live Redis. `REDIS_URL` (public Railway
  proxy) is in `.env.local`.

- Phase 2: events **worker** done — `workers/events-worker.ts` (BullMQ Worker,
  buffers + batch `createMany` every 5s or 500 events; jobs ack only after they
  persist, so a crash retries them). Run via `npm run worker:events` (tsx).
  Verified the full pipeline end-to-end (enqueue → worker → Postgres row).

- Phase 2: events surfaced on the project page — `countEventsForProject` +
  `listRecentEvents` in `src/lib/projects.ts`; the detail page shows total count
  + the 10 most-recent events (newest first). Read funcs verified live.

- Phase 2: events chart — `getEventCountsByDay` (raw SQL `date_trunc`, gap-filled,
  projectId bound as a param) in `src/lib/projects.ts` + a Recharts `EventsChart`
  client component on the project page (14-day bar chart). Aggregation verified
  live.

- NL-to-SQL (started): SQL **safety layer** — `src/lib/safe-sql.ts`.
  `validateSelect` (node-sql-parser AST: single read-only SELECT, only the
  `events` relation) + `runProjectQuery` (projectId injected via CTE, read-only
  txn, statement timeout + LIMIT). Verified: rejects writes / other tables /
  multi-statement, and cross-project isolation holds. No OpenAI key needed.

## What I'm working on now
- Next NL-to-SQL slice: OpenAI generation (NL question → SQL over the `events`
  schema) + query UI (save to the `Query` table, run via safe-sql, show results).
  NEEDS `OPENAI_API_KEY` in `.env.local`.
