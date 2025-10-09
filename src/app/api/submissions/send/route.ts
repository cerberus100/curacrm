import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CuraGenesisClient } from "@/lib/curagenesis-client";
import { IntakePayloadSchema, SubmissionCreateSchema } from "@/lib/validations";
import { z } from "zod";
import { randomUUID } from "crypto";

/**
 * POST /api/submissions/send
 * Send account to CuraGenesis with idempotency
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const { accountId } = SubmissionCreateSchema.parse(body);

    // Load account with contacts and owner rep
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        contacts: true,
        ownerRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Validate account readiness
    if (account.contacts.length === 0) {
      return NextResponse.json(
        { error: "Account must have at least one contact before sending" },
        { status: 400 }
      );
    }

    // Build intake payload
    const payload = IntakePayloadSchema.parse({
      source_system: "intake_crm",
      submitted_at: new Date().toISOString(),
      practice: {
        name: account.practiceName,
        npi_org: account.npiOrg,
        ein_tin: account.einTin,
        specialty: account.specialty,
        ehr_system: account.ehrSystem,
        phone: account.phoneE164 || account.phoneDisplay,
        email: account.email,
        website: account.website,
        address: {
          line1: account.addressLine1,
          line2: account.addressLine2,
          city: account.city,
          state: account.state,
          zip: account.zip,
        },
        lead_source: account.leadSource,
      },
      contacts: account.contacts.map((contact) => ({
        contact_type: contact.contactType,
        full_name: contact.fullName,
        npi_individual: contact.npiIndividual,
        title: contact.title,
        email: contact.email,
        phone: contact.phoneE164 || contact.phoneDisplay,
        preferred_contact_method: contact.preferredContactMethod,
      })),
      rep: account.ownerRep ? {
        id: account.ownerRep.id,
        name: account.ownerRep.name,
        email: account.ownerRep.email,
      } : undefined,
    });

    // Generate idempotency key (or reuse from recent failed attempt within 24h)
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        accountId,
        status: "FAILED",
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24h window
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const idempotencyKey = existingSubmission?.idempotencyKey || randomUUID();

    // Create submission record
    const submission = await prisma.submission.create({
      data: {
        accountId,
        submittedById: account.ownerRepId || "",
        idempotencyKey,
        status: "PENDING",
        requestPayload: payload as any,
      },
    });

    // Send to CuraGenesis
    const client = new CuraGenesisClient();
    const response = await client.submitIntake(payload, idempotencyKey);

    // Update submission with response
    const updatedSubmission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: response.success ? "SUCCESS" : "FAILED",
        httpCode: response.status,
        responsePayload: response.data as any,
        errorMessage: response.error,
      },
    });

    // Update account status
    if (response.success) {
      await prisma.account.update({
        where: { id: accountId },
        data: {
          status: "SUBMITTED",
        },
      });
    } else {
      await prisma.account.update({
        where: { id: accountId },
        data: {
          status: "PENDING",
        },
      });
    }

    // Return appropriate response
    if (response.success) {
      return NextResponse.json({
        success: true,
        submission: updatedSubmission,
        data: response.data,
        message: "✅ Account successfully sent to CuraGenesis",
      });
    } else {
      // Map error codes to friendly messages
      let friendlyMessage = "Failed to send account to CuraGenesis";
      
      if (response.status === 409) {
        friendlyMessage = "This practice may already exist in CuraGenesis. Please check for duplicates.";
      } else if (response.status === 422) {
        friendlyMessage = "CuraGenesis rejected some fields. Please verify NPI, Email, and State are correct.";
      } else if (response.status === 408 || response.status === 504) {
        friendlyMessage = "Network timeout. Please try again or contact Admin if the issue persists.";
      } else if (response.status >= 500) {
        friendlyMessage = "CuraGenesis service is temporarily unavailable. Please try again later.";
      }

      return NextResponse.json({
        success: false,
        submission: updatedSubmission,
        error: friendlyMessage,
        details: response.error,
      }, { status: response.status || 500 });
    }

  } catch (error) {
    console.error("POST /api/submissions/send error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          issues: error.errors,
          message: "Account data is incomplete or invalid. Please review all required fields."
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send submission" },
      { status: 500 }
    );
  }
}
