"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  getProjectForUser,
  createApiKeyForProject,
} from "@/lib/projects";
import type { GenerateKeyState } from "./types";

// projectId is bound on the client via .bind(); useActionState supplies _prev
// and formData.
export async function generateApiKeyAction(
  projectId: string,
  _prev: GenerateKeyState,
  formData: FormData,
): Promise<GenerateKeyState> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not signed in." };

  // Authorize: the project must belong to the signed-in user.
  const project = await getProjectForUser(projectId, userId);
  if (!project) return { ok: false, error: "Project not found." };

  const name = String(formData.get("name") ?? "");
  const { token } = await createApiKeyForProject(project.id, name);

  revalidatePath(`/dashboard/projects/${project.id}`);
  return { ok: true, token };
}
