import "./load-env";

import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { EVENTS_QUEUE, type EventJob } from "@/lib/queue";

const FLUSH_INTERVAL_MS = 5000;
const BATCH_SIZE = 500;

type Pending = {
  data: EventJob;
  resolve: () => void;
  reject: (err: unknown) => void;
};

let buffer: Pending[] = [];
let flushing = false;

// Batch-insert buffered events into Postgres, then resolve their jobs so BullMQ
// marks them complete. On failure we reject so the jobs stay in Redis and retry.
async function flush() {
  if (flushing || buffer.length === 0) return;
  flushing = true;
  const batch = buffer;
  buffer = [];
  try {
    await prisma.event.createMany({
      data: batch.map((b) => ({
        projectId: b.data.projectId,
        name: b.data.name,
        properties: b.data.properties as Prisma.InputJsonValue,
        timestamp: new Date(b.data.timestamp),
      })),
    });
    for (const b of batch) b.resolve();
    console.log(`flushed ${batch.length} event(s) to Postgres`);
  } catch (err) {
    for (const b of batch) b.reject(err);
    console.error("flush failed, jobs will retry:", err);
  } finally {
    flushing = false;
  }
}

const timer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);

// Workers use their own blocking Redis connection (BullMQ best practice).
const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

const worker = new Worker<EventJob>(
  EVENTS_QUEUE,
  // A job only "completes" once its data is flushed to Postgres, so an
  // unflushed crash leaves the job in Redis to be retried (at-least-once).
  (job) =>
    new Promise<void>((resolve, reject) => {
      buffer.push({ data: job.data, resolve, reject });
      if (buffer.length >= BATCH_SIZE) void flush();
    }),
  { connection, concurrency: BATCH_SIZE },
);

worker.on("ready", () =>
  console.log(`events worker ready (queue: "${EVENTS_QUEUE}")`),
);
worker.on("failed", (job, err) =>
  console.error(`job ${job?.id} failed:`, err.message),
);

async function shutdown(signal: string) {
  console.log(`\n${signal} received, draining…`);
  clearInterval(timer);
  await flush();
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
