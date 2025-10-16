// POST /api/mail/send - Send email from CRM

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { getCurrentUser } from '@/lib/auth';

const prisma = new PrismaClient();

// Initialize SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    // Get current user from session
    const user = await getCurrentUser();
    
    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { to, subject, text, html, customerId } = body;

    // Validate required fields
    if (!to || !to.length || !subject) {
      return NextResponse.json(
        { error: 'to, subject are required' },
        { status: 400 }
      );
    }

    const emailBody = html || text || '';

    // Prepare email parameters
    const emailParams = {
      Source: user.email,
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: html ? {
            Data: html,
            Charset: 'UTF-8',
          } : undefined,
          Text: {
            Data: text || emailBody.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
            Charset: 'UTF-8',
          },
        },
      },
    };

    // Send email via SES
    const command = new SendEmailCommand(emailParams);
    const result = await sesClient.send(command);

    // Generate message ID for tracking
    const messageId = result.MessageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store sent email in database
    const sentEmail = await prisma.mailMessage.create({
      data: {
        userId: user.id,
        accountId: customerId || null,
        folder: 'SENT',
        messageId,
        from: user.email,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        snippet: emailBody.substring(0, 150).replace(/<[^>]*>/g, ''),
        bodyText: text || emailBody.replace(/<[^>]*>/g, ''),
        bodyHtml: html || emailBody,
        isRead: true, // Sent emails are automatically "read"
        sentAt: new Date(),
        receivedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      threadId: result.MessageId || sentEmail.id,
      messageId: sentEmail.id,
      email: {
        id: sentEmail.id,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        sentAt: sentEmail.sentAt?.toISOString(),
      },
    });

  } catch (error: any) {
    console.error('Error sending email:', error);
    
    // Handle specific AWS SES errors
    if (error.name === 'MessageRejected') {
      return NextResponse.json(
        { error: 'Email was rejected. Please check the recipient address.' },
        { status: 400 }
      );
    }
    
    if (error.name === 'MailFromDomainNotVerifiedException') {
      return NextResponse.json(
        { error: 'Sender domain not verified. Please contact administrator.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

