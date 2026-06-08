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

## What's done
- Step 1: Clerk auth wired up — `src/proxy.ts` (clerkMiddleware, protects
  `/dashboard`), `<ClerkProvider>` + header in `src/app/layout.tsx`, sign-in/
  sign-up catch-all routes, and a protected `src/app/dashboard` page. Keys go in
  `.env.local` (placeholders committed locally; replace with real Clerk keys).

## What I'm working on now
- Step 2 (next): Prisma + schema (Project, ApiKey, Event, Query)
- Step 3 (next): folder structure (lib, components, workers)
