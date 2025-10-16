import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const CreateVendorSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  phone: z.string().optional(),
});

/**
 * GET /api/admin/vendors
 * Get all vendors (admin only)
 */
export async function GET() {
  try {
    await requireAdmin();

    const vendors = await prisma.vendor.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ vendors });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.error("Failed to fetch vendors:", error);
    return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
  }
}

/**
 * POST /api/admin/vendors
 * Create a new vendor (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const data = CreateVendorSchema.parse(body);

    const vendor = await prisma.vendor.create({
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
    console.error("Failed to create vendor:", error);
    return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 });
  }
}
