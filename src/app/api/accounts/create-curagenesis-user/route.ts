import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CuraGenesisUserAPI, CreateUserPayload } from "@/lib/curagenesis-api";
import { z } from "zod";

// Prevent static generation of this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Validation schema for the request
const CreateUserSchema = z.object({
  accountId: z.string(),
  sendWelcomeEmail: z.boolean().default(true),
});

/**
 * POST /api/accounts/create-curagenesis-user
 * Creates a user in CuraGenesis system and seeds BAA data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, sendWelcomeEmail } = CreateUserSchema.parse(body);

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

    // Find primary contact (provider or primary decision maker)
    const primaryContact = account.contacts.find(
      (c) => c.contactType === "provider" || c.isPrimary
    ) || account.contacts[0];

    if (!primaryContact) {
      return NextResponse.json(
        { error: "No primary contact found for the account" },
        { status: 400 }
      );
    }

    // Build the user creation payload
    const payload: CreateUserPayload = {
      email: primaryContact.email || account.email || "",
      firstName: primaryContact.fullName?.split(" ")[0] || "",
      lastName: primaryContact.fullName?.split(" ").slice(1).join(" ") || "",
      baaSigned: false,
      paSigned: false,
      facilityName: account.practiceName,
      facilityAddress: {
        street: account.addressLine1 || undefined,
        city: account.city || undefined,
        state: account.state || undefined,
        zip: account.zip || undefined,
        phone: account.phoneE164 || account.phoneDisplay || undefined,
      },
      facilityNPI: account.npiOrg || undefined,
      facilityTIN: account.einTin || undefined,
      facilityPhone: account.phoneE164 || account.phoneDisplay || undefined,
      primaryContactName: primaryContact.fullName || undefined,
      primaryContactEmail: primaryContact.email || undefined,
      primaryContactPhone: primaryContact.phoneE164 || primaryContact.phoneDisplay || undefined,
      salesRepresentative: account.ownerRep?.name || "",
    };

    // Add physician info if the primary contact is a provider
    if (primaryContact.contactType === "provider" && primaryContact.npiIndividual) {
      payload.physicianInfo = {
        physicianFirstName: primaryContact.fullName?.split(" ")[0] || "",
        physicianLastName: primaryContact.fullName?.split(" ").slice(1).join(" ") || "",
        npi: primaryContact.npiIndividual,
        phone: primaryContact.phoneE164 || primaryContact.phoneDisplay || undefined,
        specialty: account.specialty || undefined,
        street: account.addressLine1 || undefined,
        city: account.city || undefined,
        state: account.state || undefined,
        zip: account.zip || undefined,
      };
    }

    // Add additional physicians
    const additionalProviders = account.contacts.filter(
      (c) => c.contactType === "provider" && c.id !== primaryContact.id && c.npiIndividual
    );

    if (additionalProviders.length > 0) {
      payload.additionalPhysicians = additionalProviders.map((provider) => ({
        firstName: provider.fullName?.split(" ")[0] || "",
        lastName: provider.fullName?.split(" ").slice(1).join(" ") || "",
        npi: provider.npiIndividual || undefined,
        specialty: account.specialty || undefined,
      }));
    }

    // Create user in CuraGenesis
    const client = new CuraGenesisUserAPI();
    const response = await client.createUser(payload);

    // Store the CuraGenesis user ID in our database
    if (response.success && response.userId) {
      await prisma.account.update({
        where: { id: accountId },
        data: {
          curaGenesisUserId: response.userId,
          status: "SUBMITTED",
        },
      });

      // Create a submission record for tracking
      await prisma.submission.create({
        data: {
          accountId,
          submittedById: account.ownerRepId || "",
          idempotencyKey: `user-creation-${Date.now()}`,
          status: "SUCCESS",
          httpCode: 200,
          requestPayload: payload as any,
          responsePayload: response as any,
        },
      });
    }

    return NextResponse.json({
      success: true,
      userId: response.userId,
      message: sendWelcomeEmail 
        ? "User created successfully. Welcome email sent to primary contact."
        : "User created successfully.",
    });

  } catch (error) {
    console.error("POST /api/accounts/create-curagenesis-user error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", issues: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // Handle specific CuraGenesis API errors
      if (error.message.includes("Missing required fields")) {
        return NextResponse.json(
          { error: "Missing required fields. Please ensure email is provided." },
          { status: 400 }
        );
      } else if (error.message.includes("Unauthorized")) {
        return NextResponse.json(
          { error: "API authentication failed. Please check vendor token." },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create user in CuraGenesis" },
      { status: 500 }
    );
  }
}
