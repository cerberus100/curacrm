import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const AssignSchema = z.object({
  repId: z.string().min(1, "Rep ID is required"),
});

/**
 * PATCH /api/accounts/[id]/assign
 * Assign account to a rep (admin-only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    
    const body = await request.json().catch(() => ({}));
    const { repId } = AssignSchema.parse(body);

    // Ensure target user exists and is a rep
    const rep = await prisma.user.findFirst({
      where: { id: repId, role: "AGENT", active: true },
      select: { id: true },
    });
    
    if (!rep) {
      return NextResponse.json(
        { error: "Rep not found or not active" },
        { status: 404 }
      );
    }

    // Update account
    const updated = await prisma.account.update({
      where: { id: params.id },
      data: { ownerRepId: repId },
      include: {
        ownerRep: {
          select: { id: true, name: true, email: true }
        }
      },
    });

    // Create audit trail
    try {
      await prisma.accountAssignment.create({
        data: {
          id: crypto.randomUUID(),
          accountId: params.id,
          repId,
          assignedBy: admin.id,
        },
      });
    } catch (auditError) {
      console.error("Failed to create assignment audit:", auditError);
      // Continue even if audit fails
    }

    return NextResponse.json(updated);

  } catch (error) {
    console.error("PATCH /api/accounts/[id]/assign error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", issues: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to assign account" },
      { status: 500 }
    );
  }
}
