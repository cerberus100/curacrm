import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Initialize AWS clients
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const SendEmailSchema = z.object({
  userId: z.string(),
  accountId: z.string().optional(),
  from: z.string().email(),
  to: z.union([z.string().email(), z.array(z.string().email())]),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  subject: z.string().min(1),
  bodyText: z.string().optional(),
  bodyHtml: z.string().optional(),
  inReplyTo: z.string().optional(), // For threading
  references: z.string().optional(), // For threading
});

/**
 * POST /api/mail/send
 * Send email via AWS SES and store in database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = SendEmailSchema.parse(body);

    // Normalize to/cc/bcc to arrays
    const toAddresses = Array.isArray(data.to) ? data.to : [data.to];
    const ccAddresses = data.cc ? (Array.isArray(data.cc) ? data.cc : [data.cc]) : [];
    const bccAddresses = data.bcc ? (Array.isArray(data.bcc) ? data.bcc : [data.bcc]) : [];

    // Require either text or HTML body
    if (!data.bodyText && !data.bodyHtml) {
      return NextResponse.json(
        { error: "Either bodyText or bodyHtml is required" },
        { status: 400 }
      );
    }

    // Build SES email params
    const sesParams: any = {
      Source: data.from,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: {
          Data: data.subject,
          Charset: "UTF-8",
        },
        Body: {},
      },
    };

    if (ccAddresses.length > 0) {
      sesParams.Destination.CcAddresses = ccAddresses;
    }

    if (bccAddresses.length > 0) {
      sesParams.Destination.BccAddresses = bccAddresses;
    }

    if (data.bodyText) {
      sesParams.Message.Body.Text = {
        Data: data.bodyText,
        Charset: "UTF-8",
      };
    }

    if (data.bodyHtml) {
      sesParams.Message.Body.Html = {
        Data: data.bodyHtml,
        Charset: "UTF-8",
      };
    }

    // Add threading headers if provided
    if (data.inReplyTo || data.references) {
      sesParams.Headers = [];
      if (data.inReplyTo) {
        sesParams.Headers.push({
          Name: "In-Reply-To",
          Value: data.inReplyTo,
        });
      }
      if (data.references) {
        sesParams.Headers.push({
          Name: "References",
          Value: data.references,
        });
      }
    }

    // Send via SES
    const command = new SendEmailCommand(sesParams);
    const sesResponse = await sesClient.send(command);

    // Generate Message-ID from SES response
    const messageId = sesResponse.MessageId || `<${Date.now()}@curagenesis.com>`;

    // Create snippet from body
    const snippet = (data.bodyText || data.bodyHtml || "")
      .replace(/<[^>]*>/g, "") // Strip HTML tags
      .slice(0, 150);

    // Store sent email in database
    const mailMessage = await prisma.mailMessage.create({
      data: {
        userId: data.userId,
        accountId: data.accountId,
        folder: "SENT",
        messageId,
        inReplyTo: data.inReplyTo,
        references: data.references,
        from: data.from,
        to: toAddresses.join(", "),
        cc: ccAddresses.length > 0 ? ccAddresses.join(", ") : null,
        bcc: bccAddresses.length > 0 ? bccAddresses.join(", ") : null,
        subject: data.subject,
        snippet,
        bodyText: data.bodyText,
        bodyHtml: data.bodyHtml,
        hasAttachments: false, // TODO: Add attachment support
        attachmentCount: 0,
        isRead: true, // Sent emails are always "read"
        sentAt: new Date(),
      },
    });

    // Optionally save raw MIME to S3 (for archival/compliance)
    const bucket = process.env.S3_MAIL_BUCKET;
    if (bucket) {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const s3Key = `mail/${data.userId}/sent/${year}/${month}/${day}/${mailMessage.id}.eml`;

        // Build simple MIME message
        const mime = [
          `Message-ID: ${messageId}`,
          `From: ${data.from}`,
          `To: ${toAddresses.join(", ")}`,
          ccAddresses.length > 0 ? `Cc: ${ccAddresses.join(", ")}` : null,
          data.inReplyTo ? `In-Reply-To: ${data.inReplyTo}` : null,
          data.references ? `References: ${data.references}` : null,
          `Subject: ${data.subject}`,
          `Date: ${now.toUTCString()}`,
          `Content-Type: ${data.bodyHtml ? "text/html" : "text/plain"}; charset=UTF-8`,
          "",
          data.bodyHtml || data.bodyText || "",
        ]
          .filter(Boolean)
          .join("\r\n");

        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: mime,
            ContentType: "message/rfc822",
          })
        );

        // Update message with S3 key
        await prisma.mailMessage.update({
          where: { id: mailMessage.id },
          data: { s3Key },
        });
      } catch (s3Error) {
        console.error("Failed to save email to S3:", s3Error);
        // Don't fail the entire request if S3 save fails
      }
    }

    return NextResponse.json({
      success: true,
      messageId: sesResponse.MessageId,
      mailMessage: {
        id: mailMessage.id,
        messageId: mailMessage.messageId,
        subject: mailMessage.subject,
        sentAt: mailMessage.sentAt,
      },
    });
  } catch (error) {
    console.error("POST /api/mail/send error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", issues: error.errors },
        { status: 400 }
      );
    }

    // Check for SES-specific errors
    if (error instanceof Error) {
      if (error.message.includes("MessageRejected")) {
        return NextResponse.json(
          { error: "Email rejected by SES. Check sender verification and domain settings." },
          { status: 400 }
        );
      }
      if (error.message.includes("AccessDenied")) {
        return NextResponse.json(
          { error: "SES access denied. Check AWS credentials and permissions." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}

