import { prisma } from "@/lib/db";

// Data access for projects. Always scoped by clerkUserId — the caller passes the
// authenticated user's id (resolved via Clerk's auth()), never trusting input.

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
