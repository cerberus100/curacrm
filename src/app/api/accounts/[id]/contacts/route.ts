import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ContactSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";
import { getCurrentUser } from "@/lib/auth-helpers";
import { z } from "zod";

/**
 * POST /api/accounts/:id/contacts
 * Add contact to account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = ContactSchema.parse({
      ...body,
      accountId: params.id,
    });

    // Check if account exists
    const account = await prisma.account.findUnique({
      where: { id: params.id },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Create contact
    const contact = await prisma.contact.create({
      data: {
        accountId: validatedData.accountId,
        contactType: validatedData.contactType,
        fullName: validatedData.fullName,
        npiIndividual: validatedData.npiIndividual,
        title: validatedData.title,
        email: validatedData.email,
        phoneDisplay: validatedData.phoneDisplay,
        phoneE164: validatedData.phoneE164,
        preferredContactMethod: validatedData.preferredContactMethod,
      },
    });

    // Log activity
    const user = await getCurrentUser();
    if (user) {
      await logActivity({
        userId: user.id,
        action: "CONTACT_ADDED",
        entityType: "Contact",
        entityId: contact.id,
        entityName: contact.fullName,
        details: `Added ${validatedData.contactType} contact to ${account.practiceName}`,
        request,
      });
    }

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    console.error("POST /api/accounts/:id/contacts error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
