import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const CreateProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  unitPrice: z.number().positive(),
  category: z.string().optional(),
});

/**
 * POST /api/admin/vendors/[id]/products
 * Create a new product for vendor (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const data = CreateProductSchema.parse(body);

    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: params.id }
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Check if SKU already exists
    const existingSku = await prisma.product.findUnique({
      where: { sku: data.sku }
    });

    if (existingSku) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        vendorId: params.id,
      }
    });

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", issues: error.errors }, { status: 400 });
    }
    console.error("Failed to create product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
