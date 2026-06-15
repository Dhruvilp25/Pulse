// Liveness check — confirms the app is serving. Public: src/proxy.ts only
// protects /dashboard, so clerkMiddleware runs here but doesn't block.
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}
