import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const UpdateVendorSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  phone: z.string().optional(),
});

/**
 * GET /api/admin/vendors/[id]
 * Get vendor details with products (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const vendor = await prisma.vendor.findUnique({
      where: { id: params.id },
      include: {
        products: {
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ vendor });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.error("Failed to fetch vendor:", error);
    return NextResponse.json({ error: "Failed to fetch vendor" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/vendors/[id]
 * Update vendor (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const data = UpdateVendorSchema.parse(body);

    const vendor = await prisma.vendor.update({
      where: { id: params.id },
      data,
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    return NextResponse.json({ vendor });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", issues: error.errors }, { status: 400 });
    }
    console.error("Failed to update vendor:", error);
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/vendors/[id]
 * Delete vendor (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    await prisma.vendor.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.error("Failed to delete vendor:", error);
    return NextResponse.json({ error: "Failed to delete vendor" }, { status: 500 });
  }
}
