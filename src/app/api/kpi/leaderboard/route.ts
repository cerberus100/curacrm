import { NextRequest, NextResponse } from "next/server";
import { MetricsClient, type DateRange } from "@/lib/curagenesis-client";
import { env } from "@/lib/env";
import { z } from "zod";

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

    // Create metrics client with server-side API key
    const client = new MetricsClient(
      process.env.NEXT_PUBLIC_CG_METRICS_BASE,
      env.CG_METRICS_API_KEY
    );

    const data = await client.leaderboard(dateRange as DateRange);

    return NextResponse.json(data);
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
