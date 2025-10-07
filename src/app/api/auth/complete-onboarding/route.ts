import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const CompleteSchema = z.object({
  token: z.string().optional(),
});

/**
 * POST /api/auth/complete-onboarding
 * Mark the user as onboarded
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token } = CompleteSchema.parse(body);

    // Mark user as onboarded
    await db.user.update({
      where: { id: user.id },
      data: { onboardedAt: new Date() },
    });

    // Mark token as used if provided
    if (token) {
      const setting = await db.setting.findUnique({
        where: { key: `invite:${user.id}` },
      });

      if (setting) {
        const data = setting.value as any;
        await db.setting.update({
          where: { key: `invite:${user.id}` },
          data: {
            value: {
              ...data,
              used: true,
              usedAt: new Date().toISOString(),
            },
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/complete-onboarding error:", error);

    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
