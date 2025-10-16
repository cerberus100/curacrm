import { NextRequest, NextResponse } from "next/server";
import { getActivityLogs } from "@/lib/activity-logger";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/activity-log
 * Returns system-wide activity log (Admin only)
 * 
 * Query params:
 *   - userId: Filter by specific user
 *   - action: Filter by action type
 *   - entityType: Filter by entity type
 *   - limit: Number of results (default: 100)
 *   - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin access
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    
    const filters = {
      userId: searchParams.get("userId") || undefined,
      action: searchParams.get("action") || undefined,
      entityType: searchParams.get("entityType") || undefined,
      limit: parseInt(searchParams.get("limit") || "100"),
      offset: parseInt(searchParams.get("offset") || "0"),
    };

    const { logs, total } = await getActivityLogs(filters);

    return NextResponse.json({
      activities: logs,
      total,
      limit: filters.limit,
      offset: filters.offset,
    });
  } catch (error) {
    console.error("GET /api/activity-log error:", error);
    
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes("Admin access required")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch activity log", activities: [] },
      { status: 500 }
    );
  }
}

