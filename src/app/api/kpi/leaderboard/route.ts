import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateLeaderboardMetrics } from "@/lib/metrics-calculator";

const RequestSchema = z.object({
  dateRange: z.enum(["30d", "60d", "90d"]).default("30d"),
});

/**
 * POST /api/kpi/leaderboard
 * Returns rep leaderboard from real CuraGenesis DynamoDB data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dateRange } = RequestSchema.parse(body);

    // Calculate leaderboard metrics from real DynamoDB data
    const metrics = await calculateLeaderboardMetrics(dateRange);

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
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
