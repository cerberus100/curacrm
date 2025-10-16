import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const UpdateProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  unitPrice: z.number().positive(),
  category: z.string().optional(),
});

/**
 * PUT /api/admin/products/[id]
 * Update product (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const data = UpdateProductSchema.parse(body);

    // Check if SKU is unique (excluding current product)
    const existingSku = await prisma.product.findFirst({
      where: {
        sku: data.sku,
        NOT: { id: params.id }
      }
    });

    if (existingSku) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data,
      include: { vendor: true }
    });

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", issues: error.errors }, { status: 400 });
    }
    console.error("Failed to update product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products/[id]
 * Delete product (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    await prisma.product.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.error("Failed to delete product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
