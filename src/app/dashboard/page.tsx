import { auth, currentUser } from "@clerk/nextjs/server";
import { listProjectsForUser } from "@/lib/projects";
import { createProjectAction } from "./actions";

// This route is protected in src/proxy.ts, so reaching here implies a signed-in
// user. We read auth() on the server to scope every query by the Clerk user id.
export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();
  const projects = userId ? await listProjectsForUser(userId) : [];

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as{" "}
          {user?.primaryEmailAddress?.emailAddress ?? user?.firstName ?? userId}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Your projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No projects yet — create your first one below.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {projects.map((project) => (
              <li
                key={project.id}
                className="flex items-center justify-between rounded-md border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
              >
                <span className="font-medium">{project.name}</span>
                <span className="text-zinc-500">
                  {project.createdAt.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={createProjectAction} className="flex items-center gap-2">
        <input
          name="name"
          placeholder="New project name"
          required
          maxLength={80}
          className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
        />
        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Create
        </button>
      </form>
    </main>
  );
}
