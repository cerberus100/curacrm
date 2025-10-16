import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AccountUpdateSchema } from "@/lib/validations";
import { z } from "zod";

/**
 * GET /api/accounts/:id
 * Get single account with contacts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const account = await prisma.account.findUnique({
      where: { id: params.id },
      include: {
        ownerRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contacts: {
          orderBy: {
            createdAt: "desc",
          },
        },
        submissions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ account });
  } catch (error) {
    console.error("GET /api/accounts/:id error:", error);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/accounts/:id
 * Update account fields
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = AccountUpdateSchema.parse(body);

    // Check if account exists
    const existingAccount = await prisma.account.findUnique({
      where: { id: params.id },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Update account
    const account = await prisma.account.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        // primaryContactName: (validatedData as any).primaryContactName, // DB column doesn't exist yet
        // primaryContactPosition: (validatedData as any).primaryContactPosition, // DB column doesn't exist yet
      },
      include: {
        ownerRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contacts: true,
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error("PATCH /api/accounts/:id error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounts/:id
 * Delete account (and cascade to contacts and submissions)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.account.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/accounts/:id error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
