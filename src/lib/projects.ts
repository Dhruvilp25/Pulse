import { prisma } from "@/lib/db";
import { generateApiKey, hashApiKey } from "@/lib/api-keys";

// Data access for projects and their API keys. Always scoped by the owning
// user / project — callers pass ids resolved from Clerk's auth(), never
// trusting client input.

export function listProjectsForUser(clerkUserId: string) {
  return prisma.project.findMany({
    where: { clerkUserId },
    orderBy: { createdAt: "desc" },
  });
}

export function createProjectForUser(clerkUserId: string, name: string) {
  return prisma.project.create({
    data: { clerkUserId, name },
  });
}

export function getProjectForUser(id: string, clerkUserId: string) {
  return prisma.project.findFirst({ where: { id, clerkUserId } });
}

export async function createApiKeyForProject(projectId: string, name?: string) {
  const { token, prefix } = generateApiKey();
  const hashedKey = await hashApiKey(token);
  const apiKey = await prisma.apiKey.create({
    data: { projectId, prefix, hashedKey, name: name?.trim() || null },
  });
  // `token` (plaintext) is returned only for one-time display; we persist the
  // bcrypt hash + prefix, never the plaintext.
  return { token, apiKey };
}

export function listApiKeysForProject(projectId: string) {
  return prisma.apiKey.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}
