import { NextRequest, NextResponse } from "next/server";
import { calculateTerritoryMetrics } from "@/lib/metrics-calculator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/kpi/territory
 * Returns territory performance metrics (Admin only - shows all territories)
 * Query params:
 *   - dateRange: 30d | 60d | 90d (default: 30d)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = (searchParams.get("dateRange") || "30d") as "30d" | "60d" | "90d";

    const metrics = await calculateTerritoryMetrics(dateRange);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("GET /api/kpi/territory error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch territory metrics",
        territories: [] // Return empty array on error
      },
      { status: 500 }
    );
  }
}

