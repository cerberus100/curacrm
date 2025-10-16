import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AccountSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";
import { z } from "zod";

export const dynamic = 'force-dynamic';

/**
 * GET /api/accounts
 * List accounts (filtered by rep if not admin)
 */
export async function GET(request: NextRequest) {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || undefined;
    const status = searchParams.get("status") || undefined;
    const take = Number(searchParams.get("take") || 50);
    const skip = Number(searchParams.get("skip") || 0);

    // Build where clause
    const whereBase: any = {};
    
    // Search query
    if (q) {
      whereBase.OR = [
        { practiceName: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { state: { contains: q, mode: "insensitive" } },
      ];
    }
    
    // Status filter
    if (status) {
      whereBase.status = status;
    }

    // Role-based scoping: Reps see only their accounts, Admins see all
    const where = user.role === "ADMIN" 
      ? whereBase 
      : { AND: [{ ownerRepId: user.id }, whereBase] };

    let accounts, total;
    
    try {
      [accounts, total] = await Promise.all([
        prisma.account.findMany({
          where,
          include: {
            ownerRep: {
              select: {
                id: true,
                name: true,
                email: true,
                // team: true, // DISABLED - DB column doesn't exist yet
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
          take,
          skip,
        }),
        prisma.account.count({ where }),
      ]);
    } catch (dbError: any) {
      // If team column doesn't exist yet, try without it
      if (dbError.message?.includes('column') && dbError.message?.includes('team')) {
        console.log("Team column not found, fetching without it");
        [accounts, total] = await Promise.all([
          prisma.account.findMany({
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
            take,
            skip,
          }),
          prisma.account.count({ where }),
        ]);
      } else {
        throw dbError;
      }
    }

    return NextResponse.json({ 
      accounts, 
      total,
      take,
      skip,
      isFiltered: user.role !== "ADMIN"
    });
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
        primaryContactName: (validatedData as any).primaryContactName,
        primaryContactPosition: (validatedData as any).primaryContactPosition,
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

    // Log activity
    await logActivity({
      userId: validatedData.ownerRepId,
      action: "ACCOUNT_CREATED",
      entityType: "Account",
      entityId: account.id,
      entityName: account.practiceName,
      details: `Created practice in ${account.state}`,
      request,
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
