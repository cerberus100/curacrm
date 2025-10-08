import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to handle authentication and onboarding redirects
 * TEMPORARY: Disabled for demo/testing - allows all access
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("🔒 Middleware bypassed for demo - allowing:", pathname);
  
  // TEMPORARY: Allow all access for demo mode
  // TODO: Re-enable authentication checks when ready for production
  return NextResponse.next();

  /* ORIGINAL AUTH LOGIC (commented out for demo):
  
  console.log("🔒 Middleware:", pathname, "SKIP_AUTH:", process.env.SKIP_AUTH);

  // Skip all auth checks if SKIP_AUTH is enabled (demo mode)
  if (process.env.SKIP_AUTH === 'true') {
    console.log("✅ SKIP_AUTH enabled - allowing access to:", pathname);
    return NextResponse.next();
  }

  // Skip middleware for public routes
  const publicRoutes = ["/login", "/onboard", "/unauthorized", "/api/auth"];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    console.log("✅ Public route - allowing:", pathname);
    return NextResponse.next();
  }

  // Check if user is authenticated (has userId cookie)
  const userId = request.cookies.get("userId")?.value;

  if (!userId && pathname !== "/login") {
    console.log("❌ No userId cookie - redirecting to login from:", pathname);
    // Not authenticated, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  console.log("✅ Authenticated - allowing access to:", pathname);
  // For now, let the page components handle onboarding checks
  // This keeps the middleware simple and fast
  return NextResponse.next();
  */
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
