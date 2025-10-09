import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/invite-bulk
 * Send invites to multiple new reps via CSV data
 * Expected format: [{ firstName, lastName, email }]
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { invites } = body;

    if (!invites || !Array.isArray(invites) || invites.length === 0) {
      return NextResponse.json(
        { error: "Invites array is required" },
        { status: 400 }
      );
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[],
    };

    for (const invite of invites) {
      const { firstName, lastName, email } = invite;

      if (!firstName || !lastName || !email) {
        results.failed.push({
          email,
          reason: "Missing required fields (firstName, lastName, or email)",
        });
        continue;
      }

      try {
        // Check if email already exists
        const existingUser = await db.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          results.failed.push({
            email,
            reason: "User already exists",
          });
          continue;
        }

        // Generate temp password
        const tempPassword = generateTempPassword();
        
        // Generate invite token
        const token = randomBytes(32).toString("hex");
        
        // Create invite token
        const inviteRecord = await db.inviteToken.create({
          data: {
            email,
            token,
            tempPassword,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            createdById: "admin-demo", // In production, use actual admin ID
            role: "AGENT",
          },
        });

        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboard?token=${token}`;

        console.log(`✉️  Invite created for: ${firstName} ${lastName} (${email})`);

        results.successful.push({
          id: inviteRecord.id,
          name: `${firstName} ${lastName}`,
          email,
          inviteLink,
          tempPassword, // Only for demo
          expiresAt: inviteRecord.expiresAt,
        });
      } catch (error) {
        console.error(`Error creating invite for ${email}:`, error);
        results.failed.push({
          email,
          reason: "Database error",
        });
      }
    }

    console.log("\n==============================================");
    console.log("📧 BULK INVITE SUMMARY");
    console.log("==============================================");
    console.log(`Total processed: ${invites.length}`);
    console.log(`Successful: ${results.successful.length}`);
    console.log(`Failed: ${results.failed.length}`);
    console.log("==============================================\n");

    return NextResponse.json({
      success: true,
      message: `Processed ${invites.length} invites`,
      results,
    });
  } catch (error) {
    console.error("Error processing bulk invites:", error);
    return NextResponse.json(
      { error: "Failed to process bulk invites" },
      { status: 500 }
    );
  }
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

