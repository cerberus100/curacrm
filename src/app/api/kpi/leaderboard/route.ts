import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateLeaderboardMetrics } from "@/lib/metrics-calculator";
import { getCurrentUser } from "@/lib/auth";

const RequestSchema = z.object({
  dateRange: z.enum(["30d", "60d", "90d"]).default("30d"),
});

/**
 * POST /api/kpi/leaderboard
 * Returns rep leaderboard from real CuraGenesis DynamoDB data
 * - Admin: sees all reps
 * - Agent: sees only their own metrics
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dateRange } = RequestSchema.parse(body);

    // Get current user for role-based filtering
    const user = await getCurrentUser();
    const isAdmin = user?.role === "ADMIN";

    // Calculate leaderboard metrics from real DynamoDB data
    const metrics = await calculateLeaderboardMetrics(dateRange);

    // If agent/rep, filter to show only their own metrics
    if (!isAdmin && user) {
      // Match by email (rep email in CRM should match email in Reps table)
      const myMetrics = metrics.leaderboard.filter(
        rep => rep.repName.toLowerCase().includes(user.name.toLowerCase()) ||
              rep.repName.toLowerCase().includes(user.email.split('@')[0].toLowerCase())
      );
      
      return NextResponse.json({ leaderboard: myMetrics });
    }

    // Admin sees all
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("POST /api/kpi/leaderboard error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", issues: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch leaderboard", leaderboard: [] },
      { status: 500 }
    );
  }
}
