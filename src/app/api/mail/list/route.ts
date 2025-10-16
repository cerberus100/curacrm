// GET /api/mail/list - List inbox/sent emails for a user

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'inbox';
    const cursor = searchParams.get('cursor');
    const limit = 10;

    // Validate folder
    const folderMap: Record<string, 'INBOX' | 'SENT'> = {
      'inbox': 'INBOX',
      'sent': 'SENT'
    };
    
    const dbFolder = folderMap[folder.toLowerCase()];
    if (!dbFolder) {
      return NextResponse.json(
        { error: 'folder must be inbox or sent' },
        { status: 400 }
      );
    }

    // Build query
    const where: any = {
      userId: user.id,
      folder: dbFolder,
    };

    // Get emails from database
    // NOTE: Use raw SQL to avoid enum casting issues if the `folder` column is TEXT in DB
    const offset = cursor ? parseInt(cursor) : 0;
    const emails = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id,
             "from",
             "to",
             subject,
             snippet,
             received_at  AS "receivedAt",
             sent_at      AS "sentAt",
             is_read      AS "isRead",
             is_starred   AS "isStarred",
             folder,
             has_attachments AS "hasAttachments",
             attachment_count AS "attachmentCount"
      FROM mail_messages
      WHERE user_id = ${where.userId} AND folder = ${dbFolder}
      ORDER BY received_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Format response to match frontend expectations
    const items = emails.map(email => ({
      id: email.id,
      userId: user.id,
      folder: email.folder.toLowerCase(),
      subject: email.subject,
      fromAddress: email.from,
      toAddresses: email.to,
      date: (email.sentAt || email.receivedAt).toISOString(),
      snippet: email.snippet || '',
      s3Key: '', // Not used in current implementation
      messageId: email.id,
      hasAttachments: email.hasAttachments,
      sizeBytes: 0, // Not tracked currently
    }));

    // Calculate next cursor
    const nextCursor = emails.length === limit 
      ? String((cursor ? parseInt(cursor) : 0) + limit)
      : null;

    return NextResponse.json({
      items,
      nextCursor,
    });

  } catch (error: any) {
    console.error('Error fetching mail list:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

