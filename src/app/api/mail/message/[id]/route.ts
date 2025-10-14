// GET /api/mail/message/:id - Get email details

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-helpers';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get current user from session
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    // Get email from database - ensure it belongs to current user
    const email = await prisma.mailMessage.findFirst({
      where: { 
        id,
        userId: user.id, // Security: only return user's own emails
      },
      select: {
        id: true,
        from: true,
        to: true,
        cc: true,
        bcc: true,
        subject: true,
        bodyText: true,
        bodyHtml: true,
        receivedAt: true,
        sentAt: true,
        isRead: true,
        isStarred: true,
        folder: true,
        hasAttachments: true,
        attachmentCount: true,
        inReplyTo: true,
        references: true,
      },
    });

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    // Mark as read if not already read
    if (!email.isRead) {
      await prisma.mailMessage.update({
        where: { id },
        data: { isRead: true },
      });
    }

    // Format response
    const formattedEmail = {
      id: email.id,
      fromAddress: email.from,
      toAddresses: email.to,
      cc: email.cc,
      bcc: email.bcc,
      subject: email.subject,
      body: email.bodyHtml || email.bodyText || '',
      date: (email.sentAt || email.receivedAt).toISOString(),
      isRead: true, // Always true since we just marked it as read
      isStarred: email.isStarred,
      folder: email.folder.toLowerCase(),
      hasAttachments: email.hasAttachments,
      attachmentCount: email.attachmentCount,
      inReplyTo: email.inReplyTo,
      references: email.references,
      downloadUrl: '#', // Placeholder - not implemented yet
    };

    return NextResponse.json(formattedEmail);

  } catch (error) {
    console.error('Error fetching email message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT /api/mail/message/:id - Update email (mark as read/starred)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get current user from session
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { isRead, isStarred } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    // Update email - ensure it belongs to current user
    const updateData: any = {};
    if (typeof isRead === 'boolean') updateData.isRead = isRead;
    if (typeof isStarred === 'boolean') updateData.isStarred = isStarred;

    const email = await prisma.mailMessage.updateMany({
      where: { 
        id,
        userId: user.id, // Security: only update user's own emails
      },
      data: updateData,
    });

    if (email.count === 0) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      email: {
        id,
        isRead: isRead ?? undefined,
        isStarred: isStarred ?? undefined,
      },
    });

  } catch (error) {
    console.error('Error updating email message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

