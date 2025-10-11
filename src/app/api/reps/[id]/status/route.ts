import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UpdateStatusSchema = z.object({
  active: z.boolean(),
  reason: z.string().optional(),
});

/**
 * PATCH /api/reps/[id]/status
 * Activate or deactivate a rep (admin-only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { active, reason } = UpdateStatusSchema.parse(body);

    // Get the target user
    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, email: true }
    });

    if (!target) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent deactivating the last admin
    if (target.role === "ADMIN" && active === false) {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN", active: true }
      });
      
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot deactivate last admin" },
          { status: 400 }
        );
      }
    }

    // Update user status
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        active,
        suspensionReason: active ? null : (reason ?? null),
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        suspensionReason: true
      }
    });

    return NextResponse.json(updated);

  } catch (error) {
    console.error("PATCH /api/reps/[id]/status error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", issues: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update user status" },
      { status: 500 }
    );
  }
}
