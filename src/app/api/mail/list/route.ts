import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const QuerySchema = z.object({
  userId: z.string().optional(),
  folder: z.enum(["INBOX", "SENT", "DRAFT", "ARCHIVE", "TRASH"]).optional().default("INBOX"),
  accountId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

/**
 * GET /api/mail/list
 * List email messages for a user
 * Query params: userId, folder, accountId, limit, offset, unreadOnly
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = QuerySchema.parse({
      userId: searchParams.get("userId"),
      folder: searchParams.get("folder"),
      accountId: searchParams.get("accountId"),
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
      unreadOnly: searchParams.get("unreadOnly"),
    });

    // TODO: Get userId from authenticated session
    // For now, require userId in query params
    if (!params.userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = {
      userId: params.userId,
      folder: params.folder,
    };

    if (params.accountId) {
      where.accountId = params.accountId;
    }

    if (params.unreadOnly) {
      where.isRead = false;
    }

    // Fetch messages
    const messages = await prisma.mailMessage.findMany({
      where,
      orderBy: {
        receivedAt: "desc",
      },
      take: params.limit,
      skip: params.offset,
      select: {
        id: true,
        messageId: true,
        from: true,
        to: true,
        subject: true,
        snippet: true,
        hasAttachments: true,
        attachmentCount: true,
        isRead: true,
        isStarred: true,
        receivedAt: true,
        sentAt: true,
        folder: true,
        accountId: true,
        account: {
          select: {
            id: true,
            practiceName: true,
          },
        },
      },
    });

    // Get total count for pagination
    const total = await prisma.mailMessage.count({ where });

    return NextResponse.json({
      messages,
      pagination: {
        total,
        limit: params.limit,
        offset: params.offset,
        hasMore: params.offset + params.limit < total,
      },
    });
  } catch (error) {
    console.error("GET /api/mail/list error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", issues: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch mail messages" },
      { status: 500 }
    );
  }
}

