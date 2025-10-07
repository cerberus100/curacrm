import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/accounts/check-duplicates?npi=...&phone=...
 * Check for potential duplicate accounts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const npi = searchParams.get("npi");
    const phone = searchParams.get("phone");

    if (!npi && !phone) {
      return NextResponse.json({ matches: [] });
    }

    // Build OR conditions for matching
    const orConditions: any[] = [];
    
    if (npi) {
      orConditions.push({ npiOrg: npi });
    }
    
    if (phone) {
      orConditions.push({ phoneE164: phone });
    }

    // Find potential duplicates
    const matches = await prisma.account.findMany({
      where: {
        OR: orConditions,
      },
      select: {
        id: true,
        practiceName: true,
        npiOrg: true,
        phoneDisplay: true,
        city: true,
        state: true,
        status: true,
        ownerRep: {
          select: {
            name: true,
          },
        },
      },
      take: 5, // Limit to top 5 matches
    });

    return NextResponse.json({ 
      matches,
      count: matches.length,
      message: matches.length > 0 
        ? `Found ${matches.length} potential duplicate(s)`
        : "No duplicates found"
    });
  } catch (error) {
    console.error("GET /api/accounts/check-duplicates error:", error);
    return NextResponse.json(
      { error: "Failed to check duplicates", matches: [] },
      { status: 500 }
    );
  }
}
