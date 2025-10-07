import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { randomBytes } from "crypto";

const CreateRepSchema = z.object({
  firstName: z.string().min(1, "First name required").max(50),
  lastName: z.string().min(1, "Last name required").max(50),
  email: z.string().email("Invalid email").toLowerCase(),
});

/**
 * POST /api/users/invite
 * Admin-only: Create a new rep user and generate invite token
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin access
    await requireAdmin();

    const body = await request.json();
    const { firstName, lastName, email } = CreateRepSchema.parse(body);

    // Check if email already exists
    const existing = await db.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    // Create user with role forced to 'rep'
    const user = await db.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email,
        role: "rep", // ALWAYS rep, regardless of client payload
        active: true,
        onboardedAt: null, // Not onboarded yet
        firstLoginAt: null,
      },
    });

    // Generate one-time invite token
    const inviteToken = randomBytes(32).toString("hex");

    // Store token in settings
    await db.setting.upsert({
      where: { key: `invite:${user.id}` },
      create: {
        key: `invite:${user.id}`,
        value: {
          token: inviteToken,
          createdAt: new Date().toISOString(),
          used: false,
        },
      },
      update: {
        value: {
          token: inviteToken,
          createdAt: new Date().toISOString(),
          used: false,
        },
      },
    });

    // Generate invite link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:30003";
    const inviteLink = `${baseUrl}/onboard?token=${inviteToken}`;

    // In development, log the invite link
    if (process.env.NODE_ENV === "development") {
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✉️  NEW USER INVITE");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`Name: ${firstName} ${lastName}`);
      console.log(`Email: ${email}`);
      console.log(`Role: rep`);
      console.log(`Invite Link: ${inviteLink}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      inviteLink: process.env.NODE_ENV === "development" ? inviteLink : undefined,
    });
  } catch (error) {
    console.error("POST /api/users/invite error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
