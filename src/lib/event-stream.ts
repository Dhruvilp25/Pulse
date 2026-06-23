import { countEventsForProject } from "@/lib/projects";

// A Server-Sent Events body that pushes a project's event count: polls the DB
// and emits only when the count changes, with keep-alive comments in between.
// Auth-free so it can be unit-tested; the route handles authorization.
// (A Redis pub/sub fan-out from the worker would scale better than polling.)
export function createEventCountStream(
  projectId: string,
  intervalMs = 3000,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  return new ReadableStream({
    async start(controller) {
      let lastCount = -1;
      const emit = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // stream already closed
        }
      };

      const tick = async () => {
        if (closed) return;
        try {
          const count = await countEventsForProject(projectId);
          if (count !== lastCount) {
            lastCount = count;
            emit(`data: ${JSON.stringify({ count })}\n\n`);
          } else {
            emit(`: ping\n\n`);
          }
        } catch {
          // transient error — keep the stream open, retry next tick
        }
      };

      await tick(); // initial state immediately
      interval = setInterval(tick, intervalMs);
    },
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
    },
  });
}
