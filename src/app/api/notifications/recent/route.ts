import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Prevent static generation of this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/notifications/recent
 * Get recent notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      // Return empty notifications for unauthenticated users instead of error
      return NextResponse.json({
        success: true,
        notifications: []
      });
    }

    // Get full user with accounts
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        accounts: true
      }
    });

    if (!fullUser) {
      return NextResponse.json({
        success: true,
        notifications: []
      });
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
        if (fullUser.role === "ADMIN" || 
            (value.repId && value.repId === fullUser.id) ||
            (value.accountId && fullUser.accounts.some(acc => acc.id === value.accountId))) {
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
