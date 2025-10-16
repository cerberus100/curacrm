import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ContactUpdateSchema } from "@/lib/validations";
import { z } from "zod";

// Update contact
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
  // Validate using ContactUpdateSchema (all fields optional)
  const data = ContactUpdateSchema.parse(body);

    const updated = await prisma.contact.update({
      where: { id: params.id },
      data: {
        contactType: data.contactType,
        fullName: data.fullName,
        npiIndividual: data.npiIndividual ?? undefined,
        title: data.title ?? undefined,
        email: data.email ?? undefined,
        phoneDisplay: data.phoneDisplay ?? undefined,
        phoneE164: data.phoneE164 ?? undefined,
        preferredContactMethod: data.preferredContactMethod ?? undefined,
      },
    });

    return NextResponse.json({ contact: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.errors }, { status: 400 });
    }
    console.error("PUT /api/contacts/:id error:", error);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}

// Delete contact
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.contact.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/contacts/:id error:", error);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}

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
// Note: DELETE is defined above; keeping a single implementation
