import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 }
      );
    }

    // Fetch document
    const document = await db.libraryDocument.findUnique({
      where: { id: documentId },
      include: {
        recipients: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Check authorization
    // Admins can download anything
    // Reps can only download documents sent to them
    if (user.role !== Role.ADMIN) {
      const hasAccess = document.recipients.some((r) => r.repId === user.id);
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }

      // Mark as viewed
      await db.documentRecipient.updateMany({
        where: {
          documentId,
          repId: user.id,
          viewedAt: null,
        },
        data: {
          viewedAt: new Date(),
        },
      });
    }

    // Read file from disk
    const filePath = join(process.cwd(), "uploads", "documents", document.fileKey);
    const fileBuffer = await readFile(filePath);

    // Return file
    return new NextResponse(fileBuffer as any, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `attachment; filename="${document.fileName}"`,
      },
    });
  } catch (error) {
    console.error("Failed to download document:", error);
    return NextResponse.json(
      { error: "Failed to download document" },
      { status: 500 }
    );
  }
}

