import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateSegmentMetrics } from "@/lib/metrics-calculator";
import { getCurrentUser } from "@/lib/auth";
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  dateRange: z.enum(["30d", "60d", "90d"]).default("30d"),
});

/**
 * POST /api/kpi/segments
 * Returns segment breakdown from real CuraGenesis DynamoDB data
 * - Admin: sees all company data
 * - Agent: sees only their own data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dateRange } = RequestSchema.parse(body);

    // Get current user for role-based filtering
    const user = await getCurrentUser();
    const isAdmin = user?.role === "ADMIN";

    // Calculate segment metrics from real DynamoDB data
    // Agents see only their own data; admins see all
    const metrics = await calculateSegmentMetrics(
      dateRange,
      isAdmin ? undefined : user?.email
    );

    return NextResponse.json(metrics);
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
