import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ContactSchema } from "@/lib/validations";
import { z } from "zod";

/**
 * PATCH /api/contacts/:id
 * Update contact
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Build update data (skip validation refinement for updates)
    const updateData: any = {};
    if (body.contactType) updateData.contactType = body.contactType;
    if (body.fullName) updateData.fullName = body.fullName;
    if (body.npiIndividual !== undefined) updateData.npiIndividual = body.npiIndividual;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phoneDisplay !== undefined) updateData.phoneDisplay = body.phoneDisplay;
    if (body.phoneE164 !== undefined) updateData.phoneE164 = body.phoneE164;
    if (body.preferredContactMethod !== undefined) updateData.preferredContactMethod = body.preferredContactMethod;

    // Update contact
    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ contact });
  } catch (error) {
    console.error("PATCH /api/contacts/:id error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contacts/:id
 * Delete contact
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.contact.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/contacts/:id error:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
