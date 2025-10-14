import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateOverviewMetrics } from "@/lib/metrics-calculator";

const RequestSchema = z.object({
  dateRange: z.enum(["30d", "60d", "90d"]).default("30d"),
});

/**
 * POST /api/kpi/overview
 * Returns comprehensive KPIs from real CuraGenesis DynamoDB data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dateRange } = RequestSchema.parse(body);

    // Calculate metrics from real DynamoDB data
    const metrics = await calculateOverviewMetrics(dateRange);

    return NextResponse.json(metrics);
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
