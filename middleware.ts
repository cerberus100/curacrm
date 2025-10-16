import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  const { pathname } = request.nextUrl;

  // Admin-only routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/vendors')) {
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access Denied', message: 'Admin access required' },
        { status: 403 }
      );
    }
  }

  // Recruiter/Admin routes
  if (pathname.startsWith('/recruit')) {
    if (!token || !['ADMIN', 'RECRUITER'].includes(token.role as string)) {
      return NextResponse.json(
        { error: 'Access Denied', message: 'Recruiter or Admin access required' },
        { status: 403 }
      );
    }
  }

  // API routes that need authentication
  if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/vendors')) {
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access Denied', message: 'Admin access required' },
        { status: 403 }
      );
    }
  }

  if (pathname.startsWith('/api/recruiter')) {
    if (!token || !['ADMIN', 'RECRUITER'].includes(token.role as string)) {
      return NextResponse.json(
        { error: 'Access Denied', message: 'Recruiter or Admin access required' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/vendors/:path*', 
    '/recruit/:path*',
    '/api/admin/:path*',
    '/api/vendors/:path*',
    '/api/recruiter/:path*'
  ]
};
