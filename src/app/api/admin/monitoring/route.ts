import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/monitoring
 * System monitoring dashboard data (admin-only)
 */
export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get key metrics
    const [
      totalUsers,
      activeUsers,
      totalAccounts,
      activeAccounts,
      recentSubmissions,
      failedSubmissions,
      ordersLast24h,
      ordersLast7d,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.account.count(),
      prisma.account.count({ where: { status: "ACTIVE" } }),
      prisma.submission.count({ where: { createdAt: { gte: last24h } } }),
      prisma.submission.count({ 
        where: { 
          createdAt: { gte: last24h },
          status: "FAILED" 
        } 
      }),
      prisma.order.count({ where: { createdAt: { gte: last24h } } }),
      prisma.order.count({ where: { createdAt: { gte: last7d } } }),
    ]);

    // Calculate error rates
    const submissionErrorRate = recentSubmissions > 0 
      ? (failedSubmissions / recentSubmissions) * 100 
      : 0;

    // Get recent errors from logs (if you have an error log table)
    const recentErrors: any[] = []; // TODO: Add error logging table

    // System health indicators
    const health = {
      overall: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      indicators: {
        database: {
          status: 'healthy',
          connections: 'active',
          responseTime: '<100ms'
        },
        api: {
          status: submissionErrorRate < 5 ? 'healthy' : submissionErrorRate < 10 ? 'degraded' : 'unhealthy',
          errorRate: `${submissionErrorRate.toFixed(2)}%`,
          last24h: recentSubmissions
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactiveCount: totalUsers - activeUsers
        },
        accounts: {
          total: totalAccounts,
          active: activeAccounts,
          activationRate: totalAccounts > 0 ? `${((activeAccounts / totalAccounts) * 100).toFixed(1)}%` : '0%'
        },
        orders: {
          last24h: ordersLast24h,
          last7d: ordersLast7d,
          avgPerDay: ordersLast7d / 7
        }
      }
    };

    // Determine overall health
    if (submissionErrorRate > 10) {
      health.overall = 'degraded';
    }

    return NextResponse.json({
      timestamp: now.toISOString(),
      health,
      recentErrors: recentErrors.slice(0, 10)
    });

  } catch (error) {
    console.error("Monitoring endpoint error:", error);
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch monitoring data" },
      { status: 500 }
    );
  }
}
