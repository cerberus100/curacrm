import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { randomUUID } from "crypto";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { documentId, repIds } = body;

    if (!documentId || !Array.isArray(repIds) || repIds.length === 0) {
      return NextResponse.json(
        { error: "Document ID and rep IDs required" },
        { status: 400 }
      );
    }

    // Verify document exists
    const document = await db.libraryDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Create recipients (use upsert to avoid duplicates)
    let recipientsCreated = 0;

    for (const repId of repIds) {
      try {
        await db.documentRecipient.create({
          data: {
            id: randomUUID(),
            documentId,
            repId,
            status: "sent",
          },
        });
        recipientsCreated++;
      } catch (error: any) {
        // If unique constraint violation, skip (already sent)
        if (!error.code || error.code !== "P2002") {
          console.error(`Failed to create recipient for rep ${repId}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      recipientsCreated,
      totalRequested: repIds.length,
    });
  } catch (error) {
    console.error("Failed to send document:", error);
    return NextResponse.json(
      { error: "Failed to send document" },
      { status: 500 }
    );
  }
}

