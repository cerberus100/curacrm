import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AccountSchema } from "@/lib/validations";
import { z } from "zod";

/**
 * GET /api/accounts
 * List accounts (filtered by rep if not admin)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repId = searchParams.get("repId");
    const status = searchParams.get("status");

    // Build where clause
    const where: any = {};
    
    if (repId) {
      where.ownerRepId = repId;
    }
    
    if (status) {
      where.status = status;
    }

    const accounts = await prisma.account.findMany({
      where,
      include: {
        ownerRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contacts: true,
        _count: {
          select: {
            contacts: true,
            submissions: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("GET /api/accounts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounts
 * Create new account (draft)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = AccountSchema.parse(body);

    // Create account
    const account = await prisma.account.create({
      data: {
        practiceName: validatedData.practiceName,
        specialty: validatedData.specialty,
        state: validatedData.state,
        npiOrg: validatedData.npiOrg,
        einTin: validatedData.einTin,
        phoneDisplay: validatedData.phoneDisplay,
        phoneE164: validatedData.phoneE164,
        email: validatedData.email,
        website: validatedData.website,
        ehrSystem: validatedData.ehrSystem,
        addressLine1: validatedData.addressLine1,
        addressLine2: validatedData.addressLine2,
        city: validatedData.city,
        zip: validatedData.zip,
        leadSource: validatedData.leadSource,
        status: "PENDING",
        ownerRepId: validatedData.ownerRepId,
      },
      include: {
        ownerRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error("POST /api/accounts error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
