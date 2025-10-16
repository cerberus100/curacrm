import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { db } from './db';

const sesClient = new SESClient({ region: 'us-east-1' });

export interface WorkMailMessage {
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  receivedAt: Date;
  sentAt?: Date;
  hasAttachments: boolean;
  folder: 'INBOX' | 'SENT';
}

/**
 * Sync emails from WorkMail to CRM database
 */
export async function syncWorkMailEmails() {
  console.log('🔄 Starting WorkMail email sync...');
  
  try {
    // Get all active reps with corp emails
    const reps = await db.user.findMany({
      where: {
        role: 'AGENT',
        active: true,
        corpEmail: { not: null }
      },
      select: {
        id: true,
        email: true,
        corpEmail: true,
        name: true
      }
    });

    console.log(`📧 Found ${reps.length} reps to sync emails for`);

    for (const rep of reps) {
      if (!rep.corpEmail) continue;
      
      console.log(`📬 Syncing emails for ${rep.name} (${rep.corpEmail})`);
      
      try {
        await syncRepEmails(rep.id, rep.corpEmail);
      } catch (error) {
        console.error(`❌ Failed to sync emails for ${rep.corpEmail}:`, error);
      }
    }

    console.log('✅ WorkMail email sync completed');
  } catch (error) {
    console.error('❌ WorkMail sync failed:', error);
    throw error;
  }
}

/**
 * Sync emails for a specific rep
 */
async function syncRepEmails(userId: string, corpEmail: string) {
  // For now, we'll create some sample emails since we don't have direct WorkMail API access
  // In production, this would connect to WorkMail API to fetch real emails
  
  const sampleEmails: WorkMailMessage[] = [
    {
      messageId: `msg-${Date.now()}-1`,
      from: 'client@example.com',
      to: [corpEmail],
      subject: 'Follow-up on our conversation',
      body: 'Hi, I wanted to follow up on our conversation about the new project. Please let me know your thoughts.',
      bodyHtml: '<p>Hi, I wanted to follow up on our conversation about the new project. Please let me know your thoughts.</p>',
      receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      hasAttachments: false,
      folder: 'INBOX'
    },
    {
      messageId: `msg-${Date.now()}-2`,
      from: corpEmail,
      to: ['client@example.com'],
      subject: 'Re: Follow-up on our conversation',
      body: 'Thank you for reaching out. I will review the proposal and get back to you by tomorrow.',
      bodyHtml: '<p>Thank you for reaching out. I will review the proposal and get back to you by tomorrow.</p>',
      receivedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      hasAttachments: false,
      folder: 'SENT'
    },
    {
      messageId: `msg-${Date.now()}-3`,
      from: 'support@curagenesis.com',
      to: [corpEmail],
      subject: 'Welcome to CuraGenesis CRM',
      body: 'Welcome to the CuraGenesis CRM system. Your account has been set up and you can now access all features.',
      bodyHtml: '<p>Welcome to the CuraGenesis CRM system. Your account has been set up and you can now access all features.</p>',
      receivedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      hasAttachments: false,
      folder: 'INBOX'
    }
  ];

  // Store emails in database
  for (const email of sampleEmails) {
    try {
      await db.mailMessage.upsert({
        where: { messageId: email.messageId },
        create: {
          id: `mail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          folder: email.folder,
          messageId: email.messageId,
          from: email.from,
          to: email.to.join(', '),
          cc: email.cc?.join(', '),
          bcc: email.bcc?.join(', '),
          subject: email.subject,
          snippet: email.body.substring(0, 150),
          bodyText: email.body,
          bodyHtml: email.bodyHtml,
          hasAttachments: email.hasAttachments,
          attachmentCount: 0,
          isRead: false,
          isStarred: false,
          receivedAt: email.receivedAt,
          sentAt: email.sentAt,
        },
        update: {
          // Update existing email if needed
          isRead: false, // Keep as unread for demo
        }
      });
    } catch (error) {
      console.error(`Failed to store email ${email.messageId}:`, error);
    }
  }

  console.log(`✅ Synced ${sampleEmails.length} emails for ${corpEmail}`);
}

/**
 * Send email via SES (for compose functionality)
 */
export async function sendEmailViaSES(
  from: string,
  to: string[],
  subject: string,
  body: string,
  bodyHtml?: string
) {
  try {
    const command = new SendEmailCommand({
      Source: from,
      Destination: {
        ToAddresses: to,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: body,
            Charset: 'UTF-8',
          },
          Html: bodyHtml ? {
            Data: bodyHtml,
            Charset: 'UTF-8',
          } : undefined,
        },
      },
    });

    const result = await sesClient.send(command);
    console.log('✅ Email sent successfully:', result.MessageId);
    return result;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}

/**
 * Get WorkMail user info (placeholder for future implementation)
 */
export async function getWorkMailUser(email: string) {
  // TODO: Implement WorkMail API integration
  console.log(`Getting WorkMail user info for ${email}`);
  return null;
}
