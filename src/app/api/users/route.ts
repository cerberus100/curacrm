import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

/**
 * GET /api/users
 * List users (admins see all, reps see only themselves)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");

    // Build where clause
    const where: any = roleFilter ? { role: roleFilter.toUpperCase() as any, active: true } : undefined;

    // Admin sees all users; reps see only themselves
    const items = user.role === "ADMIN"
      ? await prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            team: true, // Include team for admins
            active: true,
            onboardedAt: true,
            createdAt: true,
            _count: {
              select: { accounts: true },
            },
          },
          orderBy: { name: "asc" },
        })
      : await prisma.user.findMany({
          where: { id: user.id },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
          },
        });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/users error:", error);

    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
