import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/complete
 * Mark BAA and W9 as completed for a user
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, baaAccepted, w9Accepted } = body;

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
        { error: "Invite token has already been used" },
        { status: 400 }
      );
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invite token has expired" },
        { status: 400 }
      );
    }

    // Create or update user
    let user = await db.user.findUnique({
      where: { email: invite.email },
    });

    if (!user) {
      // Create new user
      user = await db.user.create({
        data: {
          name: invite.name,
          email: invite.email,
          role: "rep",
          active: true,
          tempPassword: invite.tempPassword,
          passwordResetRequired: true,
          baaCompleted: baaAccepted || false,
          baaCompletedAt: baaAccepted ? new Date() : null,
          w9Completed: w9Accepted || false,
          w9CompletedAt: w9Accepted ? new Date() : null,
          onboardedAt: (baaAccepted && w9Accepted) ? new Date() : null,
          firstLoginAt: null,
        },
      });

      // Create document records
      if (baaAccepted) {
        await db.document.create({
          data: {
            userId: user.id,
            type: "baa",
            fileName: "BAA_Agreement.pdf",
            status: "signed",
            signedAt: new Date(),
          },
        });
      }

      if (w9Accepted) {
        await db.document.create({
          data: {
            userId: user.id,
            type: "w9",
            fileName: "W9_Form.pdf",
            status: "signed",
            signedAt: new Date(),
          },
        });
      }
    } else {
      // Update existing user
      const updateData: any = {};
      
      if (baaAccepted && !user.baaCompleted) {
        updateData.baaCompleted = true;
        updateData.baaCompletedAt = new Date();
        
        // Create document record
        await db.document.create({
          data: {
            userId: user.id,
            type: "baa",
            fileName: "BAA_Agreement.pdf",
            status: "signed",
            signedAt: new Date(),
          },
        });
      }

      if (w9Accepted && !user.w9Completed) {
        updateData.w9Completed = true;
        updateData.w9CompletedAt = new Date();
        
        // Create document record
        await db.document.create({
          data: {
            userId: user.id,
            type: "w9",
            fileName: "W9_Form.pdf",
            status: "signed",
            signedAt: new Date(),
          },
        });
      }

      // Check if onboarding is complete
      const baaComplete = baaAccepted || user.baaCompleted;
      const w9Complete = w9Accepted || user.w9Completed;
      
      if (baaComplete && w9Complete && !user.onboardedAt) {
        updateData.onboardedAt = new Date();
      }

      user = await db.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    // Mark invite as used
    await db.inviteToken.update({
      where: { id: invite.id },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });

    console.log(`✅ Onboarding progress for ${user.email}:`);
    console.log(`   BAA: ${user.baaCompleted ? "✓" : "✗"}`);
    console.log(`   W9: ${user.w9Completed ? "✓" : "✗"}`);
    console.log(`   Onboarded: ${user.onboardedAt ? "✓" : "✗"}`);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        baaCompleted: user.baaCompleted,
        w9Completed: user.w9Completed,
        onboardedAt: user.onboardedAt,
        needsPasswordReset: user.passwordResetRequired,
      },
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}

