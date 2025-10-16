import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRepOrAdmin } from "@/lib/auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ReactivateSchema = z.object({
  note: z.string().optional(),
});

/**
 * POST /api/accounts/[id]/reactivate
 * Reactivate a dormant or closed practice (admin or owning rep)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRepOrAdmin();

    const body = await request.json().catch(() => ({}));
    const { note } = ReactivateSchema.parse(body);

    // Get the account
    const account = await prisma.account.findUnique({
      where: { id: params.id },
      select: { 
        id: true, 
        status: true, 
        ownerRepId: true,
        practiceName: true 
      }
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Row-level permission: reps can only modify their own accounts; admins can modify any
    if (session.role !== "ADMIN" && session.id !== account.ownerRepId) {
      return NextResponse.json(
        { error: "Forbidden: You can only reactivate your own accounts" },
        { status: 403 }
      );
    }

    // Only allow reactivation from dormant/closed
    if (!["DORMANT", "CLOSED"].includes(account.status)) {
      return NextResponse.json(
        { error: "Only dormant or closed accounts can be reactivated" },
        { status: 400 }
      );
    }

    // Reactivate account and log activity
    await prisma.$transaction([
      prisma.account.update({
        where: { id: account.id },
        data: { 
          status: "ACTIVE",
          updatedAt: new Date()
        }
      }),
      prisma.activity.create({
        data: {
          accountId: account.id,
          userId: session.id,
          type: "reactivation",
          subject: "Account reactivated",
          body: note ?? `Account "${account.practiceName}" reactivated to ACTIVE status`
        }
      })
    ]);

    return NextResponse.json({ 
      ok: true, 
      status: "ACTIVE",
      message: "Account reactivated successfully" 
    });

  } catch (error) {
    console.error("POST /api/accounts/[id]/reactivate error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", issues: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to reactivate account" },
      { status: 500 }
    );
  }
}
