import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { logActivity } from "@/lib/activity-logger";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
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
        password: true,
        role: true,
        active: true,
        onboardStatus: true,
        firstLoginAt: true,
      }
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      // Log failed login attempt
      await logActivity({
        userId: user.id,
        action: "LOGIN_FAILED",
        details: `Failed login attempt for ${email}`,
        request,
      });
      
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Force change password UX: if flagged, instruct client to redirect
    if (user.onboardStatus !== "ACTIVE" || (await prisma.user.findUnique({ where: { id: user.id }, select: { passwordResetRequired: true } }))?.passwordResetRequired) {
      return NextResponse.json({ error: "Password reset required", reason: "PASSWORD_RESET_REQUIRED" }, { status: 403 });
    }

    // Check if user is active
    if (!user.active) {
      return NextResponse.json(
        { error: "Account is deactivated" },
        { status: 403 }
      );
    }

    // Update first login if needed
    if (!user.firstLoginAt) {
      await prisma.user.update({
        where: { id: user.id },
        data: { firstLoginAt: new Date() }
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Set secure cookie
    const cookieStore = await cookies();
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    // Log successful login
    await logActivity({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      details: `Successful login for ${email}`,
      request,
    });

    // Return user data (without password)
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        onboardStatus: user.onboardStatus,
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
