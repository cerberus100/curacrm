import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

// Prevent static generation of this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/notifications/recent
 * Get recent notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user to determine which notifications to show
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get recent notifications from settings table
    const notificationKeys = await prisma.setting.findMany({
      where: {
        key: {
          startsWith: "notification_"
        }
      },
      orderBy: {
        key: "desc"
      },
      take: 20
    });

    // Filter and format notifications
    const notifications = notificationKeys
      .map(setting => {
        const value = setting.value as any;
        
        // Filter by user's accounts or admin role
        if (user.role === "admin" || 
            (value.repId && value.repId === userId) ||
            (value.accountId && user.accounts.some(acc => acc.id === value.accountId))) {
          return {
            id: setting.key,
            ...value
          };
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 10); // Limit to 10 most recent

    return NextResponse.json({
      success: true,
      notifications
    });

  } catch (error) {
    console.error("GET /api/notifications/recent error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
