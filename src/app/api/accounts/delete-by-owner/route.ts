import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/accounts/delete-by-owner
 * Delete all accounts by a specific owner email (Admin only for now)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Find the target user
    const targetUser = await db.user.findUnique({
      where: { email },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find all accounts by this user
    const accounts = await db.account.findMany({
      where: { ownerRepId: targetUser.id },
      include: { 
        contacts: true, 
        submissions: true 
      }
    });

    console.log(`Found ${accounts.length} accounts by ${email}`);

    let deleted = 0;
    for (const account of accounts) {
      console.log(`Deleting account: ${account.practiceName}`);
      
      // Delete related records first
      await db.contact.deleteMany({
        where: { accountId: account.id }
      });
      
      await db.submission.deleteMany({
        where: { accountId: account.id }
      });
      
      // Delete account
      await db.account.delete({
        where: { id: account.id }
      });
      
      deleted++;
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted} accounts for ${email}`,
      accountsDeleted: deleted,
    });
  } catch (error) {
    console.error("DELETE /api/accounts/delete-by-owner error:", error);
    return NextResponse.json(
      { error: "Failed to delete accounts", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

