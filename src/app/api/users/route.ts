import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Force dynamic rendering for routes using cookies()
export const dynamic = 'force-dynamic';

/**
 * GET /api/users
 * Admin-only: List all users
 */
export async function GET() {
  try {
    // Require admin access
    await requireAdmin();

    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        onboardedAt: true,
        firstLoginAt: true,
        createdAt: true,
        _count: {
          select: { accounts: true },
        },
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("GET /api/users error:", error);

    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
