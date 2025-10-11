import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

/**
 * GET /api/reps/[id]
 * Get rep detail (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    
    const rep = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        repProfile: true,
        userDocuments: true,
        accounts: {
          select: {
            id: true,
            practiceName: true,
            status: true,
            totalOrders: true,
          }
        },
        recruiterInvitedBy: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });
    
    if (!rep) {
      return NextResponse.json({ error: "Rep not found" }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      rep
    });
    
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    console.error("Failed to fetch rep:", error);
    return NextResponse.json({ 
      error: "Failed to fetch rep" 
    }, { status: 500 });
  }
}

/**
 * PATCH /api/reps/[id]
 * Update rep (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    
    const body = await request.json();
    const { active } = body;
    
    const updateData: any = {};
    if (typeof active === 'boolean') {
      updateData.active = active;
    }
    
    const rep = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      include: {
        repProfile: true,
      }
    });
    
    return NextResponse.json({
      success: true,
      rep
    });
    
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    console.error("Failed to update rep:", error);
    return NextResponse.json({ 
      error: "Failed to update rep" 
    }, { status: 500 });
  }
}
