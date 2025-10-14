import { NextRequest, NextResponse } from "next/server";
import { calculateTerritoryMetrics } from "@/lib/metrics-calculator";
import { getCurrentUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/kpi/territory
 * Returns territory performance metrics
 * - Admin: sees all territories
 * - Agent: sees only their own territory
 * Query params:
 *   - dateRange: 30d | 60d | 90d (default: 30d)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = (searchParams.get("dateRange") || "30d") as "30d" | "60d" | "90d";

    // Get current user for role-based filtering
    const user = await getCurrentUser();
    const isAdmin = user?.role === "ADMIN";

    // Calculate territory metrics
    // Agents see only their own territory; admins see all
    const metrics = await calculateTerritoryMetrics(
      dateRange,
      isAdmin ? undefined : user?.email
    );

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

