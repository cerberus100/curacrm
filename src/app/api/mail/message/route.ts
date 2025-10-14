import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const QuerySchema = z.object({
  id: z.string(),
  markAsRead: z.coerce.boolean().optional().default(false),
});

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

/**
 * GET /api/mail/message
 * Get full email message details with S3 signed URL for raw .eml
 * Query params: id, markAsRead (optional, default false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = QuerySchema.parse({
      id: searchParams.get("id"),
      markAsRead: searchParams.get("markAsRead"),
    });

    // Fetch message
    const message = await prisma.mailMessage.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        account: {
          select: {
            id: true,
            practiceName: true,
            email: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Mark as read if requested
    if (params.markAsRead && !message.isRead) {
      await prisma.mailMessage.update({
        where: { id: params.id },
        data: { isRead: true },
      });
      message.isRead = true;
    }

    // Generate S3 signed URL for raw .eml file if it exists
    let rawEmailUrl: string | null = null;
    if (message.s3Key) {
      const bucket = process.env.S3_MAIL_BUCKET;
      if (bucket) {
        try {
          const command = new GetObjectCommand({
            Bucket: bucket,
            Key: message.s3Key,
          });
          rawEmailUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
        } catch (error) {
          console.error("Failed to generate S3 signed URL:", error);
        }
      }
    }

    return NextResponse.json({
      message,
      rawEmailUrl,
    });
  } catch (error) {
    console.error("GET /api/mail/message error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", issues: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch message" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/mail/message
 * Update message flags (read, starred, folder)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    const UpdateSchema = z.object({
      id: z.string(),
      isRead: z.boolean().optional(),
      isStarred: z.boolean().optional(),
      folder: z.enum(["INBOX", "SENT", "DRAFT", "ARCHIVE", "TRASH"]).optional(),
    });

    const data = UpdateSchema.parse(body);
    const { id, ...updateData } = data;

    // Update message
    const message = await prisma.mailMessage.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("PATCH /api/mail/message error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", issues: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update message" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mail/message
 * Delete a message (move to TRASH or permanent delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const permanent = searchParams.get("permanent") === "true";

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    if (permanent) {
      // Permanent delete
      await prisma.mailMessage.delete({
        where: { id },
      });
    } else {
      // Move to trash
      await prisma.mailMessage.update({
        where: { id },
        data: { folder: "TRASH" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/mail/message error:", error);

    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}

