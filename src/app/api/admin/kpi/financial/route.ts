import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { CuraGenesisFinancialsAPI } from "@/lib/curagenesis-financials-api";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  dateRange: z.enum(["7d", "30d", "90d", "1y", "all"]).default("30d"),
  includeProjections: z.boolean().optional(),
});

/**
 * POST /api/admin/kpi/financial
 * Get financial KPIs including revenue, COGS, and margins (admin only)
 */
export async function GET(request: NextRequest) {
  return handleFinancialRequest(request);
}

export async function POST(request: NextRequest) {
  return handleFinancialRequest(request);
}

async function handleFinancialRequest(request: NextRequest) {
  try {
    await requireAdmin();
    
    let dateRange = "30d";
    let includeProjections = false;
    
    if (request.method === 'POST') {
      const body = await request.json();
      const parsed = RequestSchema.parse(body);
      dateRange = parsed.dateRange;
      includeProjections = parsed.includeProjections || false;
    } else {
      const searchParams = new URL(request.url).searchParams;
      dateRange = (searchParams.get('dateRange') as any) || "30d";
      includeProjections = searchParams.get('includeProjections') === 'true';
    }
    
    // Calculate date filter
    const dateFilter = getDateFilter(dateRange);
    
    // Fetch orders with items and vendor costs
    const orders = await prisma.order.findMany({
      where: {
        orderDate: dateFilter,
      },
      include: {
        items: {
          include: {
            vendorProduct: true
          }
        },
        account: {
          select: {
            practiceName: true,
            state: true,
            ownerRep: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // Calculate financial metrics
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalOrders = orders.length;
    let totalItems = 0;
    let itemsWithCost = 0;
    let revenueByState: Record<string, number> = {};
    let revenueByRep: Record<string, number> = {};
    let marginByCategory: Record<string, { revenue: number; cogs: number }> = {};

    for (const order of orders) {
      const orderRevenue = parseFloat(order.totalAmount.toString());
      totalRevenue += orderRevenue;

      // Track by state
      const state = order.account?.state || "Unknown";
      revenueByState[state] = (revenueByState[state] || 0) + orderRevenue;

      // Track by rep
      const repName = order.account?.ownerRep?.name || "Unassigned";
      revenueByRep[repName] = (revenueByRep[repName] || 0) + orderRevenue;

      // Calculate COGS for this order
      let orderCOGS = 0;
      for (const item of order.items) {
        totalItems++;
        
        if (item.unitCostUsd) {
          const itemCost = parseFloat(item.unitCostUsd.toString()) * item.quantity;
          orderCOGS += itemCost;
          itemsWithCost++;

          // Track by category
          const category = item.vendorProduct?.category || "Uncategorized";
          if (!marginByCategory[category]) {
            marginByCategory[category] = { revenue: 0, cogs: 0 };
          }
          marginByCategory[category].revenue += parseFloat(item.totalPrice.toString());
          marginByCategory[category].cogs += itemCost;
        }
      }
      totalCOGS += orderCOGS;
    }

    // Calculate margins
    const grossMargin = totalRevenue - totalCOGS;
    const grossMarginPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

    // Calculate average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgOrderCOGS = totalOrders > 0 ? totalCOGS / totalOrders : 0;

    // Format response
    const response: any = {
      summary: {
        totalRevenue,
        totalCOGS,
        grossMargin,
        grossMarginPercent: Math.round(grossMarginPercent * 100) / 100,
        totalOrders,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        avgOrderCOGS: Math.round(avgOrderCOGS * 100) / 100,
        costDataCoverage: totalItems > 0 ? (itemsWithCost / totalItems) * 100 : 0,
      },
      byState: Object.entries(revenueByState)
        .map(([state, revenue]) => ({
          state,
          revenue,
          orderCount: orders.filter(o => (o.account?.state || "Unknown") === state).length,
        }))
        .sort((a, b) => b.revenue - a.revenue),
      byRep: Object.entries(revenueByRep)
        .map(([rep, revenue]) => ({
          rep,
          revenue,
          orderCount: orders.filter(o => (o.account?.ownerRep?.name || "Unassigned") === rep).length,
        }))
        .sort((a, b) => b.revenue - a.revenue),
      byCategory: Object.entries(marginByCategory)
        .map(([category, data]) => ({
          category,
          revenue: data.revenue,
          cogs: data.cogs,
          margin: data.revenue - data.cogs,
          marginPercent: data.revenue > 0 ? ((data.revenue - data.cogs) / data.revenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue),
      dateRange,
      generatedAt: new Date().toISOString(),
    };

    // Add projections if requested
    if (includeProjections) {
      const daysInRange = getDaysInRange(dateRange);
      const dailyRevenue = totalRevenue / daysInRange;
      
      response.projections = {
        next30Days: dailyRevenue * 30,
        next90Days: dailyRevenue * 90,
        annualized: dailyRevenue * 365,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", issues: error.errors }, { status: 400 });
    }
    console.error("Failed to generate financial KPIs:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}

function getDateFilter(dateRange: string) {
  const now = new Date();
  let startDate = new Date();

  switch (dateRange) {
    case "7d":
      startDate.setDate(now.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(now.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    case "1y":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case "all":
      return undefined; // No date filter
  }

  return {
    gte: startDate,
    lte: now,
  };
}

function getDaysInRange(dateRange: string): number {
  switch (dateRange) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    case "1y": return 365;
    case "all": return 365; // Default to annual for projections
    default: return 30;
  }
}
