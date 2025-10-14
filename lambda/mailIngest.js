// ============================================================================
// LAMBDA: mailIngest
// WorkMail → S3 → Database email ingestion
// ============================================================================

const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { simpleParser } = require("mailparser");
const { Client } = require("pg");

// Initialize AWS clients
const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-2" });
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || "us-east-2" });

// Environment variables
const S3_MAIL_BUCKET = process.env.S3_MAIL_BUCKET;
const DB_SECRET_ARN = process.env.DB_SECRET_ARN; // RDS/Aurora secret with DB credentials

/**
 * Get database credentials from Secrets Manager
 */
async function getDbCredentials() {
  const command = new GetSecretValueCommand({
    SecretId: DB_SECRET_ARN,
  });
  
  const response = await secretsClient.send(command);
  return JSON.parse(response.SecretString);
}

/**
 * Get database connection
 */
async function getDbConnection() {
  const creds = await getDbCredentials();
  
  const client = new Client({
    host: creds.host,
    port: creds.port || 5432,
    database: creds.dbname || "curacrm",
    user: creds.username,
    password: creds.password,
    ssl: { rejectUnauthorized: false },
  });
  
  await client.connect();
  return client;
}

/**
 * Map email recipient to CRM user ID
 */
async function getUserIdFromEmail(dbClient, email) {
  const result = await dbClient.query(
    'SELECT id FROM users WHERE email = $1 LIMIT 1',
    [email.toLowerCase()]
  );
  
  return result.rows.length > 0 ? result.rows[0].id : null;
}

/**
 * Extract practice/account from email domain or sender
 */
async function getAccountIdFromEmail(dbClient, from, to) {
  // Try to find account by practice email
  const result = await dbClient.query(
    'SELECT id FROM accounts WHERE LOWER(email) = $1 LIMIT 1',
    [from.toLowerCase()]
  );
  
  return result.rows.length > 0 ? result.rows[0].id : null;
}

/**
 * Parse and store email message
 */
async function processEmail(rawEmail, recipientEmail) {
  console.log("Processing email for recipient:", recipientEmail);
  
  // Parse MIME email
  const parsed = await simpleParser(rawEmail);
  
  console.log("Parsed email:", {
    from: parsed.from?.text,
    to: parsed.to?.text,
    subject: parsed.subject,
    messageId: parsed.messageId,
  });
  
  // Connect to database
  const dbClient = await getDbConnection();
  
  try {
    // Map recipient email to user ID
    const userId = await getUserIdFromEmail(dbClient, recipientEmail);
    
    if (!userId) {
      console.warn(`No user found for recipient: ${recipientEmail}`);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "No user found, email skipped" }),
      };
    }
    
    // Try to find associated account
    const fromEmail = parsed.from?.value?.[0]?.address || parsed.from?.text || "";
    const accountId = await getAccountIdFromEmail(dbClient, fromEmail, recipientEmail);
    
    // Generate S3 key
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const uuid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const s3Key = `mail/${userId}/inbox/${year}/${month}/${day}/${uuid}.eml`;
    
    // Save raw email to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_MAIL_BUCKET,
        Key: s3Key,
        Body: rawEmail,
        ContentType: "message/rfc822",
      })
    );
    
    console.log("Saved email to S3:", s3Key);
    
    // Extract body text
    const bodyText = parsed.text || "";
    const bodyHtml = parsed.html || "";
    
    // Create snippet (first 150 chars)
    const snippet = bodyText.slice(0, 150);
    
    // Count attachments
    const hasAttachments = parsed.attachments && parsed.attachments.length > 0;
    const attachmentCount = parsed.attachments?.length || 0;
    
    // Extract threading headers
    const messageId = parsed.messageId || null;
    const inReplyTo = parsed.inReplyTo || null;
    const references = parsed.references?.join(" ") || null;
    
    // Extract addresses
    const from = parsed.from?.text || "";
    const to = parsed.to?.text || "";
    const cc = parsed.cc?.text || null;
    
    // Insert into database
    const insertQuery = `
      INSERT INTO mail_messages (
        id, user_id, account_id, folder, message_id, in_reply_to, references,
        "from", "to", cc, subject, snippet, body_text, body_html,
        s3_key, has_attachments, attachment_count, is_read, received_at,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'INBOX', $3, $4, $5,
        $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, false, $16,
        NOW(), NOW()
      )
      ON CONFLICT (message_id) DO NOTHING
      RETURNING id
    `;
    
    const result = await dbClient.query(insertQuery, [
      userId,
      accountId,
      messageId,
      inReplyTo,
      references,
      from,
      to,
      cc,
      parsed.subject || "",
      snippet,
      bodyText,
      bodyHtml,
      s3Key,
      hasAttachments,
      attachmentCount,
      parsed.date || now,
    ]);
    
    if (result.rows.length > 0) {
      console.log("Email stored in database with ID:", result.rows[0].id);
    } else {
      console.log("Email already exists (duplicate Message-ID)");
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Email processed successfully",
        s3Key,
        userId,
        accountId,
      }),
    };
  } finally {
    await dbClient.end();
  }
}

/**
 * Lambda handler
 */
exports.handler = async (event) => {
  console.log("Lambda triggered with event:", JSON.stringify(event, null, 2));
  
  try {
    // WorkMail delivers email in event.content (raw MIME)
    // or references S3 location in event.s3Path
    
    let rawEmail;
    let recipientEmail;
    
    if (event.content) {
      // Raw MIME provided directly
      rawEmail = Buffer.from(event.content, "utf-8");
      recipientEmail = event.envelope?.recipients?.[0] || event.recipient;
    } else if (event.s3Path) {
      // Email stored in S3, need to fetch it
      const [bucket, ...keyParts] = event.s3Path.split("/");
      const key = keyParts.join("/");
      
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      
      const response = await s3Client.send(command);
      rawEmail = await streamToBuffer(response.Body);
      recipientEmail = event.envelope?.recipients?.[0] || event.recipient;
    } else {
      throw new Error("No email content or S3 path provided in event");
    }
    
    if (!recipientEmail) {
      throw new Error("No recipient email found in event");
    }
    
    return await processEmail(rawEmail, recipientEmail);
  } catch (error) {
    console.error("Lambda error:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
    };
  }
};

/**
 * Helper to convert stream to buffer
 */
async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

