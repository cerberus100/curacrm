import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// In production, this would upload to S3
// For now, storing locally in /uploads
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const type = formData.get("type") as string;
    const description = formData.get("description") as string | null;
    const shareWithAllReps = formData.get("shareWithAllReps") === "true";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!title || !type) {
      return NextResponse.json(
        { error: "Title and type are required" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "uploads", "documents");
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique file key
    const fileExtension = file.name.split(".").pop();
    const fileKey = `${randomUUID()}.${fileExtension}`;
    const filePath = join(uploadsDir, fileKey);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Save to database
    const document = await db.libraryDocument.create({
      data: {
        id: randomUUID(),
        title,
        type,
        description,
        fileKey,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedById: user.id,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If shareWithAllReps, create recipients for all AGENT users
    if (shareWithAllReps) {
      const allReps = await db.user.findMany({
        where: { role: Role.AGENT, active: true },
        select: { id: true },
      });

      if (allReps.length > 0) {
        await db.documentRecipient.createMany({
          data: allReps.map(rep => ({
            id: randomUUID(),
            documentId: document.id,
            repId: rep.id,
            sentAt: new Date(),
            status: "SENT",
          })),
        });
      }
    }

    return NextResponse.json({
      success: true,
      document,
      recipientsCreated: shareWithAllReps ? (await db.user.count({ where: { role: Role.AGENT, active: true }})) : 0,
    });
  } catch (error: any) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { 
        error: "Failed to upload document",
        details: error.message || "Unknown error",
        code: error.code || null
      },
      { status: 500 }
    );
  }
}

