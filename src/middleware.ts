import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to handle authentication and onboarding redirects
 * 
 * Flow:
 * 1. Public routes (login, onboard-rep) - allow access
 * 2. Unauthenticated users - redirect to login
 * 3. Authenticated but not onboarded reps - redirect to onboard-rep
 * 4. Fully onboarded users - allow access
 * 
 * DEMO MODE: Currently bypassed for demo/testing
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("🔒 Middleware bypassed for demo - allowing:", pathname);
  
  // DEMO MODE: Allow all access for demo/testing
  // In production, uncomment the logic below
  return NextResponse.next();

  /* PRODUCTION AUTH LOGIC (to be enabled):
  
  // Public routes that don't require authentication
  const publicRoutes = [
    "/login", 
    "/onboard-rep",          // New rep onboarding page
    "/api/auth",             // Auth API routes
    "/api/onboarding",       // Onboarding API routes
    "/unauthorized"
  ];
  
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  const userId = request.cookies.get("userId")?.value;

  if (!userId) {
    // Not authenticated - redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // In production, you would:
  // 1. Fetch user from DB using userId
  // 2. Check if user.onboardedAt is null (rep hasn't completed BAA/W9)
  // 3. If not onboarded and trying to access protected routes, redirect to /onboard-rep
  // 
  // Example:
  // const user = await db.user.findUnique({ where: { id: userId } });
  // if (user.role === 'rep' && !user.onboardedAt && pathname !== '/onboard-rep') {
  //   return NextResponse.redirect(new URL('/onboard-rep', request.url));
  // }

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
