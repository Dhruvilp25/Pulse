import { authenticateApiKey } from "@/lib/projects";
import { validateEvent } from "@/lib/events";
import { enqueueEvent } from "@/lib/queue";

export const dynamic = "force-dynamic";

function extractApiKey(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  return req.headers.get("x-api-key")?.trim() || null;
}

// POST /api/ingest — authenticate by API key, validate the event, then enqueue
// to Redis. We never write to the DB here; the events worker flushes the queue
// to Postgres (see CLAUDE.md).
export async function POST(req: Request) {
  const token = extractApiKey(req);
  if (!token) {
    return Response.json({ error: "Missing API key." }, { status: 401 });
  }

  const auth = await authenticateApiKey(token);
  if (!auth) {
    return Response.json({ error: "Invalid API key." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const result = validateEvent(body);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  await enqueueEvent({
    projectId: auth.projectId,
    name: result.event.name,
    properties: result.event.properties,
    timestamp: result.event.timestamp.toISOString(),
  });

  return Response.json({ accepted: true }, { status: 202 });
}
