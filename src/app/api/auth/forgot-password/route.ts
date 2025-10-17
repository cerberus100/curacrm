import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/forgot-password
 * Send password reset email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
      }
    });

    // Always return success (don't reveal if email exists or not - security)
    // But only send email if user actually exists
    if (user && user.active) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

      // Store token (using settings table as temp storage)
      await prisma.setting.upsert({
        where: { key: `password_reset:${user.id}` },
        create: {
          key: `password_reset:${user.id}`,
          value: {
            token: resetToken,
            userId: user.id,
            expiresAt: expiresAt.toISOString(),
            createdAt: new Date().toISOString(),
          }
        },
        update: {
          value: {
            token: resetToken,
            userId: user.id,
            expiresAt: expiresAt.toISOString(),
            createdAt: new Date().toISOString(),
          }
        }
      });

      // Send email
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://curagenesiscrm.com'}/auth/reset-password?token=${resetToken}`;
      
      await sendEmail({
        to: user.email,
        subject: "Reset Your CuraGenesis CRM Password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0E9FB7;">Password Reset Request</h2>
            <p>Hi ${user.name},</p>
            <p>You requested to reset your password for your CuraGenesis CRM account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0E9FB7; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Reset Password
            </a>
            <p style="color: #666; font-size: 14px;">
              This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link:<br/>
              <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px;">${resetUrl}</code>
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;"/>
            <p style="color: #999; font-size: 12px;">
              CuraGenesis CRM System<br/>
              If you need help, contact support at admin@curagenesis.com
            </p>
          </div>
        `
      });
    }

    // Always return success (security - don't reveal if email exists)
    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, a reset link has been sent."
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

