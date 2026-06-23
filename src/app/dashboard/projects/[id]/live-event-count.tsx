"use client";

import { useEffect, useState } from "react";

// Subscribes to the project's SSE stream and live-updates the total. Seeded with
// the server-rendered count so it's correct before the stream connects.
export function LiveEventCount({
  projectId,
  initial,
}: {
  projectId: string;
  initial: number;
}) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const es = new EventSource(`/api/projects/${projectId}/stream`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof data.count === "number") setCount(data.count);
      } catch {
        // ignore malformed messages
      }
    };
    // EventSource auto-reconnects on error; nothing to do here.
    return () => es.close();
  }, [projectId]);

  return (
    <span className="text-sm text-zinc-500">{count.toLocaleString()} total</span>
  );
}
