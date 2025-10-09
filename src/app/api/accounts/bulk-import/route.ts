import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CSVRowSchema } from "@/lib/validations";
import { formatPhoneDisplay, formatPhoneE164 } from "@/lib/validations";
import { z } from "zod";

/**
 * POST /api/accounts/bulk-import
 * Create multiple accounts from CSV data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows, ownerRepId } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows provided" },
        { status: 400 }
      );
    }

    const results = {
      success: [] as any[],
      failed: [] as any[],
      total: rows.length,
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        // Validate row
        const validated = CSVRowSchema.parse(row);

        // Format phone if provided
        let phoneDisplay = validated.phone || null;
        let phoneE164 = null;
        if (validated.phone) {
          phoneDisplay = formatPhoneDisplay(validated.phone);
          phoneE164 = formatPhoneE164(validated.phone);
        }

        // Create account
        const account = await prisma.account.create({
          data: {
            practiceName: validated.practice_name,
            state: validated.state,
            npiOrg: validated.npi_org || null,
            phoneDisplay,
            phoneE164,
            email: validated.email || null,
            addressLine1: validated.address_line1 || null,
            addressLine2: validated.address_line2 || null,
            city: validated.city || null,
            zip: validated.zip || null,
            status: "PENDING",
            ownerRepId,
          },
        });

        // Format contact phone
        let contactPhoneDisplay = validated.contact_phone || null;
        let contactPhoneE164 = null;
        if (validated.contact_phone) {
          contactPhoneDisplay = formatPhoneDisplay(validated.contact_phone);
          contactPhoneE164 = formatPhoneE164(validated.contact_phone);
        }

        // Create contact
        await prisma.contact.create({
          data: {
            accountId: account.id,
            contactType: validated.contact_type,
            fullName: validated.contact_full_name,
            email: validated.contact_email || null,
            phoneDisplay: contactPhoneDisplay,
            phoneE164: contactPhoneE164,
          },
        });

        results.success.push({
          row: i + 1,
          accountId: account.id,
          practiceName: validated.practice_name,
        });

      } catch (error) {
        let errorMessage = "Unknown error";
        
        if (error instanceof z.ZodError) {
          errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(", ");
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        results.failed.push({
          row: i + 1,
          practice: row.practice_name || "Unknown",
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Imported ${results.success.length} of ${results.total} accounts`,
    });

  } catch (error) {
    console.error("POST /api/accounts/bulk-import error:", error);
    return NextResponse.json(
      { error: "Failed to process bulk import" },
      { status: 500 }
    );
  }
}
