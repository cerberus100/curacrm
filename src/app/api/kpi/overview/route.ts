import { NextRequest, NextResponse } from "next/server";
import { MetricsClient, type DateRange } from "@/lib/curagenesis-client";
import { env } from "@/lib/env";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  dateRange: z.enum(["30d", "60d", "90d"]).default("30d"),
});

/**
 * GET /api/kpi/overview
 * Returns comprehensive KPIs with default 30d range
 */
export async function GET(request: NextRequest) {
  return await handleOverviewRequest("30d");
}

/**
 * POST /api/kpi/overview
 * Server-side proxy to CuraGenesis metrics API
 * Returns comprehensive KPIs organized by category
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dateRange } = RequestSchema.parse(body);
    return await handleOverviewRequest(dateRange);
  } catch (error) {
    console.error("POST /api/kpi/overview error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", issues: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch overview metrics" },
      { status: 500 }
    );
  }
}

async function handleOverviewRequest(dateRange: string) {
  // Check if user is admin for COGS data
  let isAdmin = false;
  let isAgent = false;
  let userId = null;
  let cogsData = null;
  
  try {
    const { getCurrentUser } = await import("@/lib/auth-helpers");
    const user = await getCurrentUser();
    isAdmin = user?.role === "ADMIN";
    isAgent = user?.role === "AGENT";
    userId = user?.id;
    
    // If admin, calculate COGS
    if (isAdmin) {
      const { prisma } = await import("@/lib/db");
      
      // Get total revenue from orders
      const revenueData = await prisma.order.aggregate({
        _sum: {
          totalAmount: true
        }
      });
      
      // Get total COGS from order items
      const cogsResult = await prisma.orderItem.aggregate({
        _sum: {
          unitCostUsd: true
        },
        where: {
          unitCostUsd: {
            not: null
          }
        }
      });
      
      const totalRevenue = parseFloat(revenueData._sum.totalAmount?.toString() || "0");
      const totalCOGS = parseFloat(cogsResult._sum.unitCostUsd?.toString() || "0");
      
      if (totalRevenue > 0) {
        const grossMargin = totalRevenue - totalCOGS;
        const grossMarginPercent = (grossMargin / totalRevenue) * 100;
        
        cogsData = {
          totalRevenue,
          totalCOGS,
          grossMargin,
          grossMarginPercent: Math.round(grossMarginPercent * 100) / 100
        };
      }
    }
  } catch (error) {
    console.error("Error fetching user/COGS data:", error);
  }
  
  // Fetch real data from database
  const { prisma } = await import("@/lib/db");
  
  // Get date range
  const now = new Date();
  const daysAgo = parseInt(dateRange.replace('d', ''));
  const startDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
  
  // For agents, filter by their accounts
  const accountFilter = isAgent && userId ? { ownerRepId: userId } : {};
  
  // Get account statistics
  const [totalAccounts, activeAccounts, recentAccounts] = await Promise.all([
    prisma.account.count({ where: accountFilter }),
    prisma.account.count({ where: { ...accountFilter, status: "ACTIVE" } }),
    prisma.account.count({ where: { ...accountFilter, createdAt: { gte: startDate } } })
  ]);
  
  // Get submission statistics
  const [totalSubmissions, successfulSubmissions] = await Promise.all([
    prisma.submission.count({ where: { account: accountFilter } }),
    prisma.submission.count({ where: { account: accountFilter, status: "SUCCESS" } })
  ]);
  
  // Get order statistics
  const orders = await prisma.order.findMany({
    where: { account: accountFilter },
    include: { items: true }
  });
  
  const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount.toString()), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Calculate conversion rates
  const conversionRate = totalAccounts > 0 ? (activeAccounts / totalAccounts) : 0;
  const sendRate = totalAccounts > 0 ? (totalSubmissions / totalAccounts) : 0;
  
  const data = {
    conversion: {
      practicesAdded: totalAccounts, // Total practices in database (from sync + manual entry)
      sendToCuraGenesisRate: sendRate,
      activationRate: conversionRate,
      avgDaysToFirstOrder: 12.3, // Would need to calculate from actual data
      dropOffRate30d: 0.18, // Would need to calculate from actual data
    },
    sales: {
      totalSalesVolume: totalRevenue,
      totalSalesArea: totalRevenue / 2, // Placeholder calculation
      averageOrderValue: avgOrderValue,
      averageOrderSize: avgOrderValue / 2, // Placeholder calculation
      ordersPerActivePractice: activeAccounts > 0 ? totalOrders / activeAccounts : 0,
      newOrders: totalOrders, // Would need to differentiate new vs repeat
      repeatOrders: 0, // Would need to calculate
      revenuePerRep: totalRevenue, // For agents, this is their total
      grossMargin: 0.68, // Would need to calculate from COGS
    },
    retention: {
      retention90d: 0.76, // Would need to calculate
      monthlyActivePractices: activeAccounts,
      churnRate: 0.09, // Would need to calculate
      avgReorderInterval: 18.5, // Would need to calculate
      lifetimeValue: avgOrderValue * 10, // Placeholder calculation
    },
    operational: {
      apiSuccessRate: successfulSubmissions > 0 ? successfulSubmissions / totalSubmissions : 0,
      avgApiLatency: 847, // Would need actual API metrics
      duplicatesPrevented: 0, // Would need to track
      webhookAckDelay: 1200, // Would need actual webhook metrics
      totalSubmissions: totalSubmissions,
      successfulSubmissions: successfulSubmissions,
      failedSubmissions: totalSubmissions - successfulSubmissions,
    },
    series: [], // Would need to aggregate daily data
  };

  // Add COGS data if admin
  if (isAdmin && cogsData) {
    return NextResponse.json({
      ...data,
      financials: cogsData
    });
  }

  return NextResponse.json(data);
}
