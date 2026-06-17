// The worker runs as a standalone Node process (not inside Next.js), so it loads
// .env.local itself — and before any other module (e.g. @/lib/db) is evaluated.
// In production (Railway) env comes from the platform; a missing .env.local is
// harmless (dotenv won't override existing process.env vars).
import { config } from "dotenv";

config({ path: ".env.local" });
