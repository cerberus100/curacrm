import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  dateRange: z.enum(["30d", "60d", "90d"]).default("30d"),
});

/**
 * POST /api/kpi/leaderboard
 * Server-side proxy to CuraGenesis leaderboard API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dateRange } = RequestSchema.parse(body);

    // Fetch real leaderboard data from database
    const { prisma } = await import("@/lib/db");
    const { getCurrentUser } = await import("@/lib/auth-helpers");
    const user = await getCurrentUser();
    const isAgent = user?.role === "AGENT";
    
    if (isAgent && user) {
      // For agents, only show their own performance
      const [accountsCount, activeCount] = await Promise.all([
        prisma.account.count({ where: { ownerRepId: user.id } }),
        prisma.account.count({ where: { ownerRepId: user.id, status: "ACTIVE" } })
      ]);
      
      const orders = await prisma.order.findMany({
        where: { account: { ownerRepId: user.id } }
      });
      
      const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount.toString()), 0);
      const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
      const activationRate = accountsCount > 0 ? activeCount / accountsCount : 0;
      
      const data = {
        leaderboard: [
          {
            rank: 1,
            repId: user.id,
            repName: user.name,
            practicesAdded: accountsCount,
            activationRate: activationRate,
            totalOrders: orders.length,
            totalRevenue: Math.round(totalRevenue),
            avgOrderValue: Math.round(avgOrderValue)
          }
        ]
      };
      return NextResponse.json(data);
    }
    
    // For admins, show full leaderboard
    const reps = await prisma.user.findMany({
      where: { role: "AGENT", active: true },
      include: {
        accounts: {
          include: {
            orders: true
          }
        }
      }
    });
    
    const leaderboardData = reps.map(rep => {
      const activeAccounts = rep.accounts.filter(a => a.status === "ACTIVE").length;
      const activationRate = rep.accounts.length > 0 ? activeAccounts / rep.accounts.length : 0;
      
      const allOrders = rep.accounts.flatMap(a => a.orders);
      const totalRevenue = allOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount.toString()), 0);
      const avgOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0;
      
      return {
        repId: rep.id,
        repName: rep.name,
        practicesAdded: rep.accounts.length,
        activationRate: activationRate,
        totalOrders: allOrders.length,
        totalRevenue: Math.round(totalRevenue),
        avgOrderValue: Math.round(avgOrderValue),
        score: totalRevenue // Sort by revenue
      };
    });
    
    // Sort by score and assign ranks
    const sortedLeaderboard = leaderboardData
      .sort((a, b) => b.score - a.score)
      .map((item, index) => ({
        rank: index + 1,
        ...item
      }))
      .slice(0, 10); // Top 10
    
    return NextResponse.json({
      leaderboard: sortedLeaderboard.map(({ score, ...item }) => item)
    });
  } catch (error) {
    console.error("POST /api/kpi/leaderboard error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", issues: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
