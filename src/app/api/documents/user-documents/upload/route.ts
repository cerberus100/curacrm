import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Upload user's onboarding document
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: "Document type is required" },
        { status: 400 }
      );
    }

    // Verify this is a valid required document type
    const requiredType = await db.requiredDocumentType.findFirst({
      where: { code: type, active: true },
    });

    if (!requiredType) {
      return NextResponse.json(
        { error: "Invalid document type" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "uploads", "user-documents");
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique file key
    const fileExtension = file.name.split(".").pop();
    const fileKey = `${user.id}_${type}_${randomUUID()}.${fileExtension}`;
    const filePath = join(uploadsDir, fileKey);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Check if user already has a document of this type
    const existingDoc = await db.userDocument.findFirst({
      where: {
        userId: user.id,
        type,
      },
    });

    let document;

    if (existingDoc) {
      // Update existing document
      document = await db.userDocument.update({
        where: { id: existingDoc.id },
        data: {
          fileName: file.name,
          fileKey,
          mimeType: file.type,
          sizeBytes: file.size,
          status: "SENT", // Mark as sent/submitted
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new document
      document = await db.userDocument.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          type,
          fileName: file.name,
          fileKey,
          mimeType: file.type,
          sizeBytes: file.size,
          status: "SENT", // Mark as sent/submitted
        },
      });
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("User document upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}

