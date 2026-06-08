import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// In Next.js 16 the `middleware` convention was renamed to `proxy` (Node.js
// runtime only). `clerkMiddleware()` returns a NextMiddleware-compatible
// function, so it works as this file's default export.

// Routes that require a signed-in user. Everything else stays public.
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
