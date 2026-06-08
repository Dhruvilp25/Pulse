import { auth, currentUser } from "@clerk/nextjs/server";

// This route is protected in src/proxy.ts, so reaching here implies a signed-in
// user. We still read auth() on the server to prove the wiring end-to-end.
export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();

  return (
    <main className="flex flex-1 flex-col gap-2 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Signed in as{" "}
        {user?.primaryEmailAddress?.emailAddress ??
          user?.firstName ??
          userId}
      </p>
    </main>
  );
}
