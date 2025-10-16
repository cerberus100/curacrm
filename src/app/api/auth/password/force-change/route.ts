import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const { newPassword } = body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 12) {
      return NextResponse.json({ error: "Password must be at least 12 characters" }, { status: 400 });
    }

    const hashed = await hashPassword(newPassword);

    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        tempPassword: null,
        passwordResetRequired: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/password/force-change error:", error);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}


