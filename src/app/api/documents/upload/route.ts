import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

/**
 * POST /api/documents/upload
 * Upload a document (admin-only for now)
 * 
 * In production, this would upload to S3
 * For now, stores in public/uploads directory
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userIds = formData.get('userIds') as string; // Comma-separated user IDs
    const type = formData.get('type') as string;
    const description = formData.get('description') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${randomUUID()}.${fileExt}`;
    
    // For production: Upload to S3
    // const s3Key = `documents/${uniqueFileName}`;
    // await uploadToS3(file, s3Key);
    
    // For now: Save to public/uploads (development only)
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {}
    
    const filePath = join(uploadDir, uniqueFileName);
    await writeFile(filePath, buffer);
    
    const fileUrl = `/uploads/${uniqueFileName}`;
    
    // Parse user IDs
    const targetUserIds = userIds ? userIds.split(',').map(id => id.trim()) : [];
    
    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { error: "At least one recipient required" },
        { status: 400 }
      );
    }

    // Create document records for each user
    const documents = await Promise.all(
      targetUserIds.map(userId =>
        prisma.document.create({
          data: {
            userId,
            type: type as any || 'OTHER',
            fileName: file.name,
            fileUrl,
            fileSize: file.size,
            mimeType: file.type,
            uploadedBy: admin.id,
            s3Key: uniqueFileName,
            description: description || null,
            status: 'PENDING',
          }
        })
      )
    );

    return NextResponse.json({
      success: true,
      documentsCreated: documents.length,
      documents
    });

  } catch (error) {
    console.error("Document upload error:", error);
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
