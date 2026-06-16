// Pure validation for an incoming ingest event. Kept free of DB/queue deps so
// it's trivially testable and reusable by the (upcoming) /api/ingest route.

export type ValidatedEvent = {
  name: string;
  properties: Record<string, unknown>;
  timestamp: Date;
};

export type ValidateResult =
  | { ok: true; event: ValidatedEvent }
  | { ok: false; error: string };

const MAX_NAME_LENGTH = 200;

export function validateEvent(input: unknown): ValidateResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Event must be a JSON object." };
  }
  const e = input as Record<string, unknown>;

  if (typeof e.name !== "string" || e.name.trim() === "") {
    return { ok: false, error: "Event 'name' is required." };
  }
  if (e.name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Event 'name' must be ≤ ${MAX_NAME_LENGTH} chars.` };
  }

  let properties: Record<string, unknown> = {};
  if (e.properties !== undefined) {
    if (
      typeof e.properties !== "object" ||
      e.properties === null ||
      Array.isArray(e.properties)
    ) {
      return { ok: false, error: "'properties' must be a JSON object." };
    }
    properties = e.properties as Record<string, unknown>;
  }

  let timestamp = new Date();
  if (e.timestamp !== undefined) {
    const parsed = new Date(e.timestamp as string | number);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: "'timestamp' is not a valid date." };
    }
    timestamp = parsed;
  }

  return { ok: true, event: { name: e.name.trim(), properties, timestamp } };
}
