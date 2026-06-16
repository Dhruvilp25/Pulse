import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProjectForUser, listApiKeysForProject } from "@/lib/projects";
import { NewApiKeyForm } from "./new-api-key-form";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // params is async in Next.js 16
  const { userId } = await auth();
  const project = userId ? await getProjectForUser(id, userId) : null;
  if (!project) notFound();

  const apiKeys = await listApiKeysForProject(project.id);

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">API keys</h2>
        {apiKeys.length === 0 ? (
          <p className="text-sm text-zinc-500">No API keys yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {apiKeys.map((key) => (
              <li
                key={key.id}
                className="flex items-center justify-between rounded-md border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
              >
                <div className="flex flex-col">
                  <code className="font-mono">{key.prefix}…</code>
                  {key.name && (
                    <span className="text-xs text-zinc-500">{key.name}</span>
                  )}
                </div>
                <span className="text-xs text-zinc-500">
                  {key.revokedAt
                    ? "revoked"
                    : `created ${key.createdAt.toLocaleDateString()}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <NewApiKeyForm projectId={project.id} />
    </main>
  );
}
