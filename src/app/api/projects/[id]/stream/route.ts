import { auth } from "@clerk/nextjs/server";
import { getProjectForUser } from "@/lib/projects";
import { createEventCountStream } from "@/lib/event-stream";

export const dynamic = "force-dynamic";

// SSE stream of a project's live event count. Auth-gated (Clerk session) and
// scoped to the owner; the streaming itself lives in createEventCountStream.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await auth();
  const project = userId ? await getProjectForUser(id, userId) : null;
  if (!project) return new Response("Not found", { status: 404 });

  return new Response(createEventCountStream(project.id), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
