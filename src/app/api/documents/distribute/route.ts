import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const DistributeSchema = z.object({
  documentId: z.string().min(1),
  userIds: z.array(z.string()).min(1, "At least one recipient required"),
});

/**
 * POST /api/documents/distribute
 * Distribute an existing document to multiple users (admin-only)
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    
    const body = await request.json();
    const { documentId, userIds } = DistributeSchema.parse(body);

    // Get the source document
    const sourceDoc = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!sourceDoc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Create copies for each user
    const distributed = await Promise.all(
      userIds.map(userId =>
        prisma.document.create({
          data: {
            userId,
            type: sourceDoc.type,
            fileName: sourceDoc.fileName,
            fileUrl: sourceDoc.fileUrl,
            fileSize: sourceDoc.fileSize,
            mimeType: sourceDoc.mimeType,
            uploadedBy: admin.id,
            s3Key: sourceDoc.s3Key,
            s3Bucket: sourceDoc.s3Bucket,
            description: sourceDoc.description,
            status: 'PENDING',
          }
        })
      )
    );

    return NextResponse.json({
      success: true,
      distributed: distributed.length,
      documents: distributed
    });

  } catch (error) {
    console.error("Document distribution error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", issues: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to distribute document" },
      { status: 500 }
    );
  }
}
