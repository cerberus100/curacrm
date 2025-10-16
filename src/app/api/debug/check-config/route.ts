import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

// Prevent static generation
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/debug/check-config
 * Debug endpoint to check configuration (remove in production)
 */
export async function GET(request: NextRequest) {
  try {
    // Check which environment variables are set
    const config = {
      hasVendorToken: !!process.env.CURAGENESIS_VENDOR_TOKEN,
      vendorTokenLength: process.env.CURAGENESIS_VENDOR_TOKEN?.length || 0,
      hasApiKey: !!process.env.CURAGENESIS_API_KEY,
      hasMetricsKey: !!process.env.CG_METRICS_API_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
      // Show first/last few chars of token for verification (if exists)
      vendorTokenPreview: process.env.CURAGENESIS_VENDOR_TOKEN 
        ? `${process.env.CURAGENESIS_VENDOR_TOKEN.substring(0, 4)}...${process.env.CURAGENESIS_VENDOR_TOKEN.slice(-4)}`
        : 'NOT SET',
      apiBase: process.env.CURAGENESIS_API_BASE || 'NOT SET',
      apiKeyPreview: process.env.CURAGENESIS_API_KEY
        ? `${process.env.CURAGENESIS_API_KEY.substring(0, 4)}...${process.env.CURAGENESIS_API_KEY.slice(-4)}`
        : 'NOT SET'
    };

    return NextResponse.json({
      success: true,
      config,
      message: "Configuration check complete"
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      hasEnvModule: !!env
    }, { status: 500 });
  }
}
