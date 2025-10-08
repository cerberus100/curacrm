import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/verify-token
 * Verify an invite token and return invite details
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Find invite token
    const invite = await db.inviteToken.findUnique({
      where: { token },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invite token" },
        { status: 404 }
      );
    }

    if (invite.used) {
      return NextResponse.json(
        { error: "This invite has already been used" },
        { status: 400 }
      );
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This invite has expired" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      invite: {
        name: invite.name,
        email: invite.email,
        tempPassword: invite.tempPassword,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error verifying token:", error);
    return NextResponse.json(
      { error: "Failed to verify token" },
      { status: 500 }
    );
  }
}

