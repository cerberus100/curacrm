import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  dateRange: z.enum(["30d", "60d", "90d"]).default("30d"),
});

/**
 * POST /api/kpi/geo
 * Server-side proxy to CuraGenesis geo metrics API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dateRange } = RequestSchema.parse(body);

    // Fetch real geographical data from database
    const { prisma } = await import("@/lib/db");
    const { getCurrentUser } = await import("@/lib/auth-helpers");
    
    const user = await getCurrentUser();
    const isAgent = user?.role === "AGENT";
    const accountFilter = isAgent && user ? { ownerRepId: user.id } : {};
    
    // Get accounts with orders grouped by state
    const accountsByState = await prisma.account.groupBy({
      by: ['state'],
      where: {
        ...accountFilter,
        state: { not: null }
      },
      _count: {
        id: true
      }
    });
    
    // Get order data by state
    const stateData = await Promise.all(
      accountsByState.map(async (stateGroup) => {
        const orders = await prisma.order.findMany({
          where: {
            account: {
              ...accountFilter,
              state: stateGroup.state
            }
          }
        });
        
        const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount.toString()), 0);
        const avgOrderValue = orders.length > 0 ? totalSales / orders.length : 0;
        
        return {
          state: stateGroup.state || "Unknown",
          stateCode: stateGroup.state?.substring(0, 2).toUpperCase() || "XX",
          practices: stateGroup._count.id,
          orders: orders.length,
          sales: Math.round(totalSales),
          avgOrderValue: Math.round(avgOrderValue)
        };
      })
    );
    
    // Sort by sales and take top 5
    const topStates = stateData
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
    
    return NextResponse.json({
      topStates,
      totalStates: accountsByState.length
    });
  } catch (error) {
    console.error("POST /api/kpi/geo error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", issues: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch geo metrics" },
      { status: 500 }
    );
  }
}
