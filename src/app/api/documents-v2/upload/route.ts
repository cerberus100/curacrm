import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/documents-v2/upload
 * Upload document with folder support and metadata
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const folderId = formData.get("folderId") as string | null;
    const visibility = formData.get("visibility") as string || "ADMIN_ONLY";
    const tags = formData.get("tags") as string; // Comma-separated

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Read file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique file key
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileKey = `documents/${timestamp}-${sanitizedName}`;
    const uploadPath = join(process.cwd(), "uploads", fileKey);

    // Ensure directory exists
    const dir = join(process.cwd(), "uploads", "documents");
    await mkdir(dir, { recursive: true });

    // Write file
    await writeFile(uploadPath, buffer);

    // Parse tags
    const tagArray = tags
      ? tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    // Create database record
    const document = await db.documentFile.create({
      data: {
        title,
        description,
        fileName: file.name,
        fileKey,
        mimeType: file.type,
        sizeBytes: file.size,
        tags: tagArray,
        folderId: folderId || null,
        uploadedById: user.id,
        visibility: visibility as any,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
        folder: {
          select: { id: true, name: true },
        },
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      action: "DOCUMENT_UPLOADED",
      entityType: "DocumentFile",
      entityId: document.id,
      entityName: document.title,
      details: `Uploaded to ${document.folder?.name || "root"} (${(file.size / 1024).toFixed(1)} KB)`,
      metadata: { fileName: file.name, mimeType: file.type, sizeBytes: file.size },
      request,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("POST /api/documents-v2/upload error:", error);
    return NextResponse.json(
      { 
        error: "Failed to upload document",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

