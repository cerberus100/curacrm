import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/detailed
 * Comprehensive health check for all system components
 */
export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, any> = {};

  // 1. Database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();
    const accountCount = await prisma.account.count();
    
    checks.database = {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      users: userCount,
      accounts: accountCount,
    };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 2. CuraGenesis API connectivity
  try {
    const apiCheckStart = Date.now();
    const hasToken = !!process.env.CURAGENESIS_VENDOR_TOKEN;
    
    if (hasToken) {
      // Simple connectivity check
      const response = await fetch(
        'https://w6mxt54h5f.execute-api.us-east-2.amazonaws.com/Prod/api/partner/v1/practices?page_size=1',
        {
          method: 'POST',
          headers: {
            'x-vendor-key': process.env.CURAGENESIS_VENDOR_TOKEN!,
          }
        }
      );
      
      checks.curagenesis_api = {
        status: response.ok ? 'healthy' : 'degraded',
        responseTime: Date.now() - apiCheckStart,
        statusCode: response.status
      };
    } else {
      checks.curagenesis_api = {
        status: 'not_configured',
        message: 'CURAGENESIS_VENDOR_TOKEN not set'
      };
    }
  } catch (error) {
    checks.curagenesis_api = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 3. Environment variables
  checks.environment = {
    NODE_ENV: process.env.NODE_ENV,
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasVendorToken: !!process.env.CURAGENESIS_VENDOR_TOKEN,
  };

  // 4. Memory usage
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const mem = process.memoryUsage();
    checks.memory = {
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`
    };
  }

  // Overall health status
  const allHealthy = Object.values(checks).every(
    check => !check.status || check.status === 'healthy' || check.status === 'not_configured'
  );

  const overallStatus = allHealthy ? 'healthy' : 'degraded';

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? `${Math.floor(process.uptime())}s` : 'N/A',
    checks,
    totalResponseTime: Date.now() - startTime
  }, {
    status: allHealthy ? 200 : 503
  });
}
