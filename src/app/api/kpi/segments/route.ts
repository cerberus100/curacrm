import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  dateRange: z.enum(["30d", "60d", "90d"]).default("30d"),
});

/**
 * POST /api/kpi/segments
 * Server-side proxy to CuraGenesis segments API
 * Returns breakdown by specialty and lead source
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dateRange } = RequestSchema.parse(body);

    // Fetch real segment data from database
    const { prisma } = await import("@/lib/db");
    const { getCurrentUser } = await import("@/lib/auth-helpers");
    
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const isAgent = user?.role === "AGENT";
    const accountFilter = isAgent && user ? { ownerRepId: user.id } : {};
    
    // Get accounts with specialty grouping
    const accounts = await prisma.account.findMany({
      where: accountFilter,
      include: {
        orders: {
          include: {
            items: true
          }
        }
      }
    });
    
    // Return empty data if no accounts (graceful fallback)
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        bySpecialty: [],
        byLeadSource: []
      });
    }
    
    // Group by specialty (if you have a specialty field, otherwise use practice type)
    const specialtyMap = new Map<string, { orders: number; sales: number; practices: Set<string> }>();
    
    accounts.forEach(account => {
      const specialty = "General Practice"; // Placeholder - add specialty field to Account if needed
      
      if (!specialtyMap.has(specialty)) {
        specialtyMap.set(specialty, { orders: 0, sales: 0, practices: new Set() });
      }
      
      const data = specialtyMap.get(specialty)!;
      data.practices.add(account.id);
      
      account.orders.forEach(order => {
        data.orders++;
        data.sales += parseFloat(order.totalAmount.toString());
      });
    });
    
    const bySpecialty = Array.from(specialtyMap.entries()).map(([segment, data]) => ({
      segment,
      orders: data.orders,
      sales: Math.round(data.sales),
      practices: data.practices.size,
      avgOrderValue: data.orders > 0 ? Math.round(data.sales / data.orders) : 0
    })).sort((a, b) => b.sales - a.sales);
    
    // For lead source, we'd need a leadSource field on Account
    // For now, return empty array since we don't have that data
    const byLeadSource: typeof bySpecialty = [];
    
    return NextResponse.json({
      bySpecialty,
      byLeadSource
    });
  } catch (error) {
    console.error("POST /api/kpi/segments error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", issues: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch segment metrics" },
      { status: 500 }
    );
  }
}
