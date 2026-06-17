import { Queue } from "bullmq";
import { Redis } from "ioredis";

export const EVENTS_QUEUE = "events";

export type EventJob = {
  projectId: string;
  name: string;
  properties: Record<string, unknown>;
  timestamp: string; // ISO 8601
};

// Reuse one Redis connection + Queue across dev hot reloads. BullMQ requires
// maxRetriesPerRequest: null; lazyConnect avoids opening a socket at import
// time (e.g. during `next build`) — it connects on the first command.
const globalForQueue = globalThis as unknown as {
  redis?: Redis;
  eventsQueue?: Queue<EventJob>;
};

export const redis =
  globalForQueue.redis ??
  new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

export const eventsQueue =
  globalForQueue.eventsQueue ??
  new Queue<EventJob>(EVENTS_QUEUE, { connection: redis });

if (process.env.NODE_ENV !== "production") {
  globalForQueue.redis = redis;
  globalForQueue.eventsQueue = eventsQueue;
}

export function enqueueEvent(job: EventJob) {
  return eventsQueue.add("event", job, {
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}
