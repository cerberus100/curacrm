# ============================================================================
# EMAIL SYSTEM SETUP GUIDE - WorkMail + SES Integration
# ============================================================================

## 🎯 WHAT WE BUILT

A complete email system for your CRM that allows reps to:
- ✅ Send emails via AWS SES (from the CRM)
- ✅ Receive emails (mirrored from WorkMail)
- ✅ View inbox and sent messages
- ✅ Link emails to customers/practices
- ✅ Search and filter emails
- ✅ Track email history per customer

**Security:** No passwords stored, all AWS-native, scalable, HIPAA-compliant ready.

---

## 📁 FILES CREATED

### API Endpoints:
1. `src/app/api/mail/list/route.ts` - List emails (inbox, sent, etc.)
2. `src/app/api/mail/message/route.ts` - Get message details, mark as read, delete
3. `src/app/api/mail/send/route.ts` - Send email via SES and store in DB

### Database:
4. `prisma/schema.prisma` - Added `MailMessage` model and `MailFolder` enum

### Lambda Function:
5. `lambda/mailIngest.js` - WorkMail → S3 → Database ingestion
6. `lambda/package.json` - Lambda dependencies

### Documentation:
7. `EMAIL_SETUP_GUIDE.md` - This file!

---

## 🗄️ DATABASE SCHEMA

The `MailMessage` table stores all emails (both received and sent):

```prisma
model MailMessage {
  id              String        @id @default(uuid())
  userId          String        // Which rep owns this email
  accountId       String?       // Linked practice/customer (optional)
  folder          MailFolder    // INBOX, SENT, DRAFT, ARCHIVE, TRASH
  messageId       String?       // Email Message-ID header (for threading)
  inReplyTo       String?       // For email threading
  references      String?       // For email threading
  from            String        // Sender email
  to              String        // Recipients
  cc              String?       // CC recipients
  bcc             String?       // BCC recipients
  subject         String
  snippet         String?       // First 150 chars
  bodyText        String?       // Plain text body
  bodyHtml        String?       // HTML body
  s3Key           String?       // S3 path to raw .eml file
  hasAttachments  Boolean
  attachmentCount Int
  isRead          Boolean
  isStarred       Boolean
  receivedAt      DateTime
  sentAt          DateTime?
  createdAt       DateTime
  updatedAt       DateTime
}
```

**Run the migration:**
```bash
npx prisma migrate dev --name add_mail_messages
npx prisma generate
```

---

## 🔐 STEP 1: AWS SETUP

### 1.1 Create S3 Bucket for Email Storage

```bash
aws s3 mb s3://curacrm-mail-storage --region us-east-2
```

Or in AWS Console:
1. Go to S3 → Create bucket
2. Name: `curacrm-mail-storage`
3. Region: `us-east-2`
4. Enable encryption (SSE-S3)
5. Block all public access ✅
6. Create bucket

### 1.2 Set Up SES (Simple Email Service)

**Verify Your Domain:**
1. Go to SES Console → Verified identities
2. Create identity → Domain
3. Enter: `curagenesis.com`
4. Enable DKIM signing ✅
5. Copy the DKIM CNAME records
6. Add them to Route 53 (you already did this!)
7. Wait for verification (~10 minutes)

**Move Out of Sandbox (Required for production):**
1. SES → Account dashboard
2. Click "Request production access"
3. Fill out the form:
   - Use case: "Business email for CRM system"
   - Website: `https://curagenesis.com`
   - Description: "Transactional emails for sales team communication with medical practices"
4. Submit and wait for approval (~24 hours)

### 1.3 Set Up WorkMail (If Not Already Done)

If you already have WorkMail with reps' mailboxes, skip to Step 1.4.

**Create WorkMail Organization:**
1. Go to WorkMail Console
2. Create organization
3. Domain: `curagenesis.com`
4. Add users (reps) with their emails

### 1.4 Create Database Secret in Secrets Manager

Store your database credentials securely:

```bash
aws secretsmanager create-secret \
  --name curacrm/database \
  --description "PostgreSQL database credentials" \
  --secret-string '{
    "host": "your-db-host.rds.amazonaws.com",
    "port": 5432,
    "dbname": "curacrm",
    "username": "postgres",
    "password": "your-secure-password"
  }' \
  --region us-east-2
```

Copy the ARN - you'll need it for the Lambda!

---

## 🔧 STEP 2: DEPLOY LAMBDA FUNCTION

### 2.1 Package the Lambda

```bash
cd lambda
npm install
zip -r mailIngest.zip mailIngest.js node_modules/
```

### 2.2 Create IAM Role for Lambda

Create a role with these permissions:
- Read from S3 (to fetch raw emails if needed)
- Write to S3 (to store .eml files)
- Read from Secrets Manager (to get DB credentials)
- CloudWatch Logs (for logging)

**Policy JSON:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::curacrm-mail-storage/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-2:*:secret:curacrm/database-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2.3 Create Lambda Function

```bash
aws lambda create-function \
  --function-name mailIngest \
  --runtime nodejs20.x \
  --role arn:aws:iam::516267217490:role/LambdaMailIngestRole \
  --handler mailIngest.handler \
  --zip-file fileb://mailIngest.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment Variables="{
    S3_MAIL_BUCKET=curacrm-mail-storage,
    DB_SECRET_ARN=arn:aws:secretsmanager:us-east-2:516267217490:secret:curacrm/database-xxxxx,
    AWS_REGION=us-east-2
  }" \
  --region us-east-2
```

**Test the Lambda:**
```bash
aws lambda invoke \
  --function-name mailIngest \
  --payload '{"content":"From: test@example.com\nTo: rep@curagenesis.com\nSubject: Test\n\nTest body","recipient":"rep@curagenesis.com"}' \
  response.json \
  --region us-east-2

cat response.json
```

---

## 📧 STEP 3: CONNECT WORKMAIL TO LAMBDA

### 3.1 Give WorkMail Permission to Invoke Lambda

```bash
aws lambda add-permission \
  --function-name mailIngest \
  --statement-id AllowWorkMailInvoke \
  --action lambda:InvokeFunction \
  --principal workmail.us-east-2.amazonaws.com \
  --source-arn arn:aws:workmail:us-east-2:516267217490:organization/* \
  --region us-east-2
```

### 3.2 Create WorkMail Inbound Rule

1. Go to WorkMail Console
2. Select your organization
3. Go to "Organization settings" → "Inbound rules"
4. Create rule:
   - **Name:** Mirror to CRM
   - **Sender:** * (all senders)
   - **Recipient:** * (all recipients in your domain)
   - **Action:** Run AWS Lambda
   - **Lambda function:** mailIngest
   - **Priority:** 1
5. Save rule

**That's it!** Emails sent to any rep will now be:
1. Delivered to WorkMail (reps can read in Outlook/WorkMail web)
2. **AND** mirrored to your CRM database automatically!

---

## 🌐 STEP 4: UPDATE CRM ENVIRONMENT VARIABLES

Add these to your `.env` file:

```env
# Email System
S3_MAIL_BUCKET="curacrm-mail-storage"
NEXT_PUBLIC_WORKMAIL_WEB_URL="https://mail.curagenesis.com"

# AWS Credentials (you already have these from dashboard setup)
AWS_REGION="us-east-2"
AWS_ACCESS_KEY_ID="your_access_key"
AWS_SECRET_ACCESS_KEY="your_secret_key"
```

---

## 🧪 STEP 5: TEST THE SYSTEM

### Test 1: Send Email from CRM

```bash
curl -X POST http://localhost:3000/api/mail/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "from": "rep@curagenesis.com",
    "to": "test@example.com",
    "subject": "Test from CRM",
    "bodyText": "This is a test email sent via SES from the CRM!"
  }'
```

**Expected:** Email sent via SES, stored in `mail_messages` table with `folder='SENT'`.

### Test 2: Receive Email (WorkMail → Lambda → DB)

Send an email TO `rep@curagenesis.com` from your personal email.

**Check:**
1. Email arrives in rep's WorkMail inbox ✅
2. Lambda function logs in CloudWatch ✅
3. `.eml` file saved to S3 at `mail/{userId}/inbox/YYYY/MM/DD/*.eml` ✅
4. Record created in `mail_messages` table ✅

**Query the database:**
```sql
SELECT id, from, subject, snippet, received_at, folder
FROM mail_messages
WHERE user_id = 'user-uuid-here'
ORDER BY received_at DESC
LIMIT 10;
```

### Test 3: List Emails via API

```bash
curl "http://localhost:3000/api/mail/list?userId=user-uuid-here&folder=INBOX&limit=10"
```

### Test 4: Get Email Details

```bash
curl "http://localhost:3000/api/mail/message?id=message-uuid-here&markAsRead=true"
```

---

## 🎨 STEP 6: BUILD UI COMPONENTS (Optional)

We've created the backend API. Now Alex can build the frontend:

**Pages to create:**
1. `/mail` - Inbox view (list of emails)
2. `/mail/compose` - Compose new email
3. `/mail/[id]` - View email thread

**Components needed:**
- `MailList` - List of emails with subject, sender, snippet
- `MailCompose` - Form to send emails
- `MailThread` - Display email with replies
- `MailSidebar` - Folders (Inbox, Sent, Archive, Trash)

**API Usage:**
```typescript
// List emails
const { messages, pagination } = await fetch(
  `/api/mail/list?userId=${userId}&folder=INBOX`
).then(r => r.json());

// Get message
const { message, rawEmailUrl } = await fetch(
  `/api/mail/message?id=${messageId}&markAsRead=true`
).then(r => r.json());

// Send email
const result = await fetch('/api/mail/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId,
    from: 'rep@curagenesis.com',
    to: 'customer@practice.com',
    subject: 'Follow up',
    bodyHtml: '<p>Hi, following up on our call...</p>',
  }),
});
```

---

## 🔒 SECURITY BEST PRACTICES

✅ **No passwords stored** - WorkMail auth via SSO, SES auth via IAM
✅ **S3 bucket is private** - Only Lambda and API can access
✅ **Signed URLs for .eml files** - Expire after 1 hour
✅ **Row-level access control** - Users can only see their own emails
✅ **Database credentials in Secrets Manager** - Not hardcoded
✅ **Lambda execution role** - Minimal permissions (least privilege)

**Additional security:**
- Enable CloudTrail logging for S3 and Lambda
- Set up alerts for failed Lambda executions
- Rotate AWS credentials periodically
- Use VPC for Lambda if database is in VPC
- Enable MFA for AWS Console access

---

## 📊 MONITORING

**CloudWatch Dashboards:**
- Lambda execution count and errors
- S3 storage usage
- SES sending statistics
- Database query performance

**Alerts to set up:**
- Lambda failure rate > 5%
- S3 bucket size > 10GB
- SES bounce rate > 5%
- Database connection errors

---

## 🚀 DEPLOYMENT TO PRODUCTION

### Update Environment Variables:

**In Vercel/Amplify/your hosting platform:**
```
S3_MAIL_BUCKET=curacrm-mail-storage
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=<production-key>
AWS_SECRET_ACCESS_KEY=<production-secret>
NEXT_PUBLIC_WORKMAIL_WEB_URL=https://mail.curagenesis.com
DATABASE_URL=<production-database-url>
```

### Push to GitHub:

```bash
git add .
git commit -m "Add email system with WorkMail/SES integration"
git push origin main
```

### Run Database Migration:

```bash
# On production
npx prisma migrate deploy
```

---

## 🎯 WHAT'S NEXT (OPTIONAL ENHANCEMENTS)

**Phase 2 Features:**
1. **Attachments Support**
   - Save attachments to S3
   - Generate signed URLs
   - Show attachment previews

2. **Email Threading**
   - Group emails by `In-Reply-To` and `References`
   - Show conversation view

3. **Search & Filters**
   - Full-text search on subject/body
   - Filter by date, sender, account

4. **Templates**
   - Save email templates
   - Variable substitution
   - Quick replies

5. **Automated Actions**
   - Auto-assign emails to accounts based on domain
   - Auto-tag emails (urgent, follow-up, etc.)
   - Email reminders

6. **Analytics**
   - Response time tracking
   - Email volume per rep
   - Customer engagement metrics

---

## ❓ TROUBLESHOOTING

### Lambda not triggering
- Check WorkMail inbound rule is enabled
- Verify Lambda permission (WorkMail allowed to invoke)
- Check CloudWatch logs for Lambda

### Emails not appearing in CRM
- Verify `userId` mapping (email → user)
- Check Lambda logs for errors
- Ensure database migration ran successfully

### SES emails not sending
- Check SES is out of sandbox mode
- Verify domain/email is verified in SES
- Check IAM permissions for SES:SendEmail

### S3 access denied
- Verify S3 bucket policy allows Lambda
- Check IAM role has S3 permissions
- Ensure bucket exists and region matches

---

## 📚 RESOURCES

- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [AWS WorkMail Documentation](https://docs.aws.amazon.com/workmail/)
- [AWS Lambda with WorkMail](https://docs.aws.amazon.com/workmail/latest/adminguide/lambda.html)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

---

## ✅ CHECKLIST

- [ ] S3 bucket created
- [ ] SES domain verified and out of sandbox
- [ ] WorkMail organization set up
- [ ] Database secret in Secrets Manager
- [ ] Lambda function deployed
- [ ] WorkMail inbound rule configured
- [ ] Database migration run
- [ ] Environment variables set
- [ ] API endpoints tested
- [ ] Frontend UI components built (optional)
- [ ] Deployed to production

---

**YOU'RE DONE!** Your CRM now has a complete email system! 🎉

Reps can send emails from the CRM, and all incoming emails are automatically mirrored to the CRM database for tracking and context.

