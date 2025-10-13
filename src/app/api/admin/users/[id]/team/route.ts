import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";
import { Role, Team } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * PATCH /api/admin/users/:id/team
 * Admin-only: Update a user's team assignment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    // Only admins can change teams
    if (!currentUser || currentUser.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { team } = await request.json();

    // Validate team value
    if (team && !Object.values(Team).includes(team as Team)) {
      return NextResponse.json(
        { error: "Invalid team value. Must be IN_HOUSE or VANTAGE_POINT" },
        { status: 400 }
      );
    }

    // Get the user being updated
    const targetUser = await db.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, role: true, team: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only agents should have teams (not admins or recruiters)
    if (targetUser.role !== Role.AGENT) {
      return NextResponse.json(
        { error: "Only agents can be assigned to teams" },
        { status: 400 }
      );
    }

    // Update the team
    const updatedUser = await db.user.update({
      where: { id: params.id },
      data: { team: team || null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        team: true,
        active: true,
        onboardStatus: true,
      },
    });

    console.log(
      `[ADMIN] User ${currentUser.email} changed team for ${updatedUser.email} to ${team || "UNASSIGNED"}`
    );

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `Team updated to ${team || "UNASSIGNED"}`,
    });
  } catch (error) {
    console.error("PATCH /api/admin/users/:id/team error:", error);
    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }
}

