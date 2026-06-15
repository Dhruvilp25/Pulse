# workers

BullMQ worker processes that run **outside** Next.js as standalone Node
processes (they are not part of the Vercel app). The events worker batch-flushes
queued events from Redis to PostgreSQL every ~5s (see CLAUDE.md). Built in
Phase 2; deployed on Railway, where the `*.railway.internal` DB host is usable.
