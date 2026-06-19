import { prisma } from "@/lib/db";
import {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  apiKeyPrefix,
  looksLikeApiKey,
} from "@/lib/api-keys";

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

/** Resolve an incoming API key to its project. Used by the ingest endpoint to
 *  authenticate requests: look up by prefix, then bcrypt-verify the full token.
 *  Returns null for unknown, revoked, or invalid keys. */
export async function authenticateApiKey(
  token: string,
): Promise<{ projectId: string; apiKeyId: string } | null> {
  if (!looksLikeApiKey(token)) return null;

  const apiKey = await prisma.apiKey.findUnique({
    where: { prefix: apiKeyPrefix(token) },
  });
  if (!apiKey || apiKey.revokedAt) return null;

  if (!(await verifyApiKey(token, apiKey.hashedKey))) return null;

  return { projectId: apiKey.projectId, apiKeyId: apiKey.id };
}

export function countEventsForProject(projectId: string) {
  return prisma.event.count({ where: { projectId } });
}

export function listRecentEvents(projectId: string, limit = 10) {
  return prisma.event.findMany({
    where: { projectId },
    orderBy: { timestamp: "desc" },
    take: limit,
  });
}
