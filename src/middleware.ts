import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to handle authentication and onboarding redirects
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip all auth checks if SKIP_AUTH is enabled (demo mode)
  if (process.env.SKIP_AUTH === 'true') {
    return NextResponse.next();
  }

  // Skip middleware for public routes
  const publicRoutes = ["/login", "/onboard", "/unauthorized", "/api/auth"];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if user is authenticated (has userId cookie)
  const userId = request.cookies.get("userId")?.value;

  if (!userId && pathname !== "/login") {
    // Not authenticated, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // For now, let the page components handle onboarding checks
  // This keeps the middleware simple and fast
  return NextResponse.next();
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
