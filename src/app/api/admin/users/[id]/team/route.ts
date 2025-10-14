import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * PATCH /api/admin/users/:id/team
 * TEMPORARILY DISABLED - Team column doesn't exist in database yet
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    { error: "Team management is temporarily disabled. Database migration required." },
    { status: 503 }
  );
}
