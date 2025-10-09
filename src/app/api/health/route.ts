import { NextRequest, NextResponse } from "next/server";

// Prevent static generation
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/health
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: {
      hasVendorToken: !!process.env.CURAGENESIS_VENDOR_TOKEN,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV
    }
  });
}
