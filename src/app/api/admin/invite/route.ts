import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/invite
 * Send a single invite to a new rep
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Generate temp password
    const tempPassword = generateTempPassword();
    
    // Generate invite token
    const token = randomBytes(32).toString("hex");
    
    // Create invite token
    const invite = await db.inviteToken.create({
      data: {
        email,
        token,
        tempPassword,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdById: "admin-demo", // In production, use actual admin ID
        role: "AGENT",
      },
    });

    // In production, send actual email here
    // For demo, we'll return the invite link
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboard?token=${token}`;

    console.log("\n==============================================");
    console.log("📧 NEW REP INVITE CREATED");
    console.log("==============================================");
    console.log(`Name: ${firstName} ${lastName}`);
    console.log(`Email: ${email}`);
    console.log(`Temp Password: ${tempPassword}`);
    console.log(`Invite Link: ${inviteLink}`);
    console.log(`Expires: ${invite.expiresAt.toLocaleString()}`);
    console.log("==============================================\n");

    return NextResponse.json({
      success: true,
      message: "Invite sent successfully",
      invite: {
        id: invite.id,
        email: invite.email,
        inviteLink,
        tempPassword, // Only for demo - in production, send via email only
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}

function generateTempPassword(): string {
  // Generate a secure random password
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

