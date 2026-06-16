"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createProjectForUser } from "@/lib/projects";

export async function createProjectAction(formData: FormData) {
  // /dashboard is already protected in src/proxy.ts, but re-check here:
  // Server Actions are public endpoints and must verify auth themselves.
  const { userId } = await auth();
  if (!userId) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await createProjectForUser(userId, name);
  revalidatePath("/dashboard");
}
