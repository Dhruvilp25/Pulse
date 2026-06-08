# Pulse — Self-Serve Analytics SaaS

## Stack
- Framework: Next.js 14, TypeScript, Tailwind CSS
- ORM: Prisma
- Database: PostgreSQL (Railway)
- Queue: Redis + BullMQ (Railway)
- Auth: Clerk
- AI: OpenAI API (NL-to-SQL)
- Charts: Recharts
- Deploy: Vercel (app) + Railway (DB + Redis)

## Project structure
- /app — Next.js app router pages and layouts
- /app/api — API routes (ingest, stream, query, keys)
- /prisma — schema.prisma and migrations
- /lib — shared utilities (db client, queue, auth helpers)
- /components — UI components
- /workers — BullMQ worker processes

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
- Nothing yet

## What I'm working on now
- Setting up Next.js project with Clerk auth
