import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth token from cookies
  const authToken = request.cookies.get('auth-token')?.value;
  
  let userRole: string | null = null;
  
  if (authToken) {
    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret';
      const decoded = jwt.verify(authToken, secret) as any;
      userRole = decoded.role;
    } catch (error) {
      // Invalid token, userRole remains null
    }
  }

  // Admin-only routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/vendors')) {
    if (!userRole || userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access Denied', message: 'Admin access required' },
        { status: 403 }
      );
    }
  }

  // Recruiter/Admin routes
  if (pathname.startsWith('/recruit')) {
    if (!userRole || !['ADMIN', 'RECRUITER'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Access Denied', message: 'Recruiter or Admin access required' },
        { status: 403 }
      );
    }
  }

  // API routes that need authentication
  if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/vendors')) {
    if (!userRole || userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access Denied', message: 'Admin access required' },
        { status: 403 }
      );
    }
  }

  if (pathname.startsWith('/api/recruiter')) {
    if (!userRole || !['ADMIN', 'RECRUITER'].includes(userRole)) {
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
