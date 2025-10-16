// GET /api/mail/message/:id - Get email details

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    const email = await prisma.mailMessage.findFirst({
      where: { id, userId: user.id },
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
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    if (!email.isRead) {
      await prisma.mailMessage.update({ where: { id }, data: { isRead: true } });
    }

    return NextResponse.json({
      id: email.id,
      fromAddress: email.from,
      toAddresses: email.to,
      cc: email.cc,
      bcc: email.bcc,
      subject: email.subject,
      body: email.bodyHtml || email.bodyText || '',
      date: (email.sentAt || email.receivedAt).toISOString(),
      sentAt: email.sentAt?.toISOString(),
      isRead: true,
      isStarred: email.isStarred,
      folder: email.folder,
      hasAttachments: email.hasAttachments,
      attachmentCount: email.attachmentCount,
      inReplyTo: email.inReplyTo,
      references: email.references,
    });
  } catch (error) {
    console.error('Error fetching email message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { isRead, isStarred } = body;
    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof isRead === 'boolean') updateData.isRead = isRead;
    if (typeof isStarred === 'boolean') updateData.isStarred = isStarred;

    const email = await prisma.mailMessage.update({
      where: { id, userId: user.id },
      data: updateData,
      select: { id: true, isRead: true, isStarred: true },
    });

    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error('Error updating email message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

