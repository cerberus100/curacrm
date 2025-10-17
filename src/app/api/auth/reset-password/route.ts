import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/reset-password
 * Reset password using token from email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Find the reset token
    const resetRecords = await prisma.setting.findMany({
      where: {
        key: {
          startsWith: 'password_reset:'
        }
      }
    });

    let userId: string | null = null;
    let tokenData: any = null;

    for (const record of resetRecords) {
      try {
        const value = typeof record.value === 'string' 
          ? JSON.parse(record.value) 
          : record.value;
        
        if (value.token === token) {
          // Check if token is expired
          const expiresAt = new Date(value.expiresAt);
          if (expiresAt < new Date()) {
            return NextResponse.json(
              { error: "Reset link has expired. Please request a new one." },
              { status: 410 }
            );
          }
          
          userId = value.userId;
          tokenData = record;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 404 }
      );
    }

    // Hash the new password
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(newPassword, salt, 10000, 64, 'sha512').toString('hex');
    const hashedPassword = `${salt}:${hash}`;

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordResetRequired: false,
      }
    });

    // Delete the used token
    if (tokenData) {
      await prisma.setting.delete({
        where: { key: tokenData.key }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}

