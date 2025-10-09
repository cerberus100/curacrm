import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CuraGenesisClient } from "@/lib/curagenesis-client";
import { IntakePayloadSchema } from "@/lib/validations";
import { randomUUID } from "crypto";

/**
 * POST /api/accounts/bulk-send
 * Send multiple accounts to CuraGenesis (queue 5 at a time)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountIds } = body;

    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json(
        { error: "No account IDs provided" },
        { status: 400 }
      );
    }

    const client = new CuraGenesisClient();
    const results = {
      success: [] as any[],
      failed: [] as any[],
      total: accountIds.length,
    };

    // Process in batches of 5
    const batchSize = 5;
    for (let i = 0; i < accountIds.length; i += batchSize) {
      const batch = accountIds.slice(i, i + batchSize);
      
      // Process batch in parallel
      await Promise.all(
        batch.map(async (accountId) => {
          try {
            // Load account
            const account = await prisma.account.findUnique({
              where: { id: accountId },
              include: {
                contacts: true,
                ownerRep: { select: { id: true, name: true, email: true } },
              },
            });

            if (!account || account.contacts.length === 0) {
              results.failed.push({
                accountId,
                practiceName: account?.practiceName || "Unknown",
                error: "Missing contacts or account not found",
              });
              return;
            }

            // Build payload
            const payload = IntakePayloadSchema.parse({
              source_system: "intake_crm",
              submitted_at: new Date().toISOString(),
              practice: {
                name: account.practiceName,
                npi_org: account.npiOrg,
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

            const idempotencyKey = randomUUID();

            // Create submission
            const submission = await prisma.submission.create({
              data: {
                accountId,
                submittedById: account.ownerRepId,
                idempotencyKey,
                status: "pending",
                requestPayload: payload as any,
              },
            });

            // Send to CuraGenesis
            const response = await client.submitIntake(payload, idempotencyKey);

            // Update submission
            await prisma.submission.update({
              where: { id: submission.id },
              data: {
                status: response.success ? "sent" : "failed",
                httpCode: response.status,
                responsePayload: response.data as any,
                errorMessage: response.error,
              },
            });

            // Update account
            await prisma.account.update({
              where: { id: accountId },
              data: {
                status: response.success ? "sent" : "failed",
              },
            });

            if (response.success) {
              results.success.push({
                accountId,
                practiceName: account.practiceName,
              });
            } else {
              results.failed.push({
                accountId,
                practiceName: account.practiceName,
                error: response.error || `HTTP ${response.status}`,
              });
            }

          } catch (error) {
            results.failed.push({
              accountId,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Sent ${results.success.length} of ${results.total} accounts`,
    });

  } catch (error) {
    console.error("POST /api/accounts/bulk-send error:", error);
    return NextResponse.json(
      { error: "Failed to process bulk send" },
      { status: 500 }
    );
  }
}
