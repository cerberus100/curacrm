import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

const VerifySchema = z.object({
  token: z.string(),
});

/**
 * POST /api/auth/verify-invite
 * Verify an invite token and log the user in
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = VerifySchema.parse(body);

    // Find the invite token in settings
    const settings = await db.setting.findMany({
      where: {
        key: {
          startsWith: "invite:",
        },
      },
    });

    let userId: string | null = null;

    for (const setting of settings) {
      const data = setting.value as any;
      if (data.token === token && !data.used) {
        userId = setting.key.replace("invite:", "");
        break;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid or expired invite token" },
        { status: 400 }
      );
    }

    // Get the user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        onboardedAt: true,
        firstLoginAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Set first login time if not set
    if (!user.firstLoginAt) {
      await db.user.update({
        where: { id: userId },
        data: { firstLoginAt: new Date() },
      });
    }

    // Set cookie (simple session)
    const cookieStore = await cookies();
    cookieStore.set("userId", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("POST /api/auth/verify-invite error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to verify invite" },
      { status: 500 }
    );
  }
}
