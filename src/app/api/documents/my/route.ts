import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

/**
 * GET /api/documents/my
 * Get current user's documents
 */
export async function GET() {
  try {
    // In demo mode, get user from localStorage (client-side)
    // In production, this would use session/auth
    
    // For demo, we'll return documents for a demo user
    // In production, you'd get the userId from the session
    const demoUserId = "demo-rep-id";

    const documents = await db.document.findMany({
      where: {
        userId: demoUserId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error("Error fetching user documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

