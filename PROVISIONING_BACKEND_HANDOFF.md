# Provisioning Backend - Implementation Handoff

**Date:** October 13, 2025  
**For:** Backend Team / Infrastructure Team  
**Domain:** @curagenesis.com (NOT @curagenesiscrm.com)

---

## 🎯 Overview

The CRM frontend (v16) has a **Hires tracking system** ready. This document provides everything needed to implement the backend provisioning system that will:

1. Create corporate emails (@curagenesis.com)
2. Send credentials to new hires
3. Track provisioning status
4. Enable CRM access for recruited sales reps

---

## 📋 What the Frontend Expects

### 1. Database Models (Prisma Schema)

You need to add these to `prisma/schema.prisma`:

```prisma
model ProvisionJob {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  status      String   @default("pending") // pending | in_progress | success | failed
  error       String?  // Error message if failed
  
  steps       Json?    // Track which steps completed: { email: true, cognito: false, ... }
  retryCount  Int      @default(0) @map("retry_count")
  
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("provision_jobs")
  @@index([userId])
  @@index([status])
}

// Update User model to add relation:
model User {
  // ... existing fields ...
  provisionJobs ProvisionJob[]
  corpEmail     String?  @unique @map("corp_email") // Already exists
  // ... rest of model ...
}
```

**Migration SQL:**
```sql
CREATE TABLE provision_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  error TEXT,
  steps JSONB,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX provision_jobs_user_id_idx ON provision_jobs(user_id);
CREATE INDEX provision_jobs_status_idx ON provision_jobs(status);

ALTER TABLE provision_jobs 
ADD CONSTRAINT provision_jobs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

---

## 🔌 API Endpoints to Implement

### 1. POST /api/provision/run
**Purpose:** Process the next pending provisioning job  
**Auth:** Admin only  
**Called by:** CRM "Retry Provisioning" button

```typescript
// File: src/app/api/provision/run/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    // Get the next pending job (oldest first)
    const job = await prisma.provisionJob.findFirst({
      where: { 
        status: { in: ["pending", "failed"] },
        retryCount: { lt: 3 } // Max 3 retries
      },
      orderBy: { createdAt: "asc" },
      include: { user: true }
    });

    if (!job) {
      return NextResponse.json({ 
        message: "No pending provisioning jobs" 
      });
    }

    // Mark as in_progress
    await prisma.provisionJob.update({
      where: { id: job.id },
      data: { status: "in_progress" }
    });

    try {
      // === YOUR PROVISIONING LOGIC HERE ===
      const result = await provisionUser(job.user);
      // ====================================

      // Mark as success
      await prisma.provisionJob.update({
        where: { id: job.id },
        data: { 
          status: "success",
          steps: result.steps,
          updatedAt: new Date()
        }
      });

      // Update user status
      await prisma.user.update({
        where: { id: job.userId },
        data: { 
          onboardStatus: "ACTIVE",
          corpEmail: result.corpEmail
        }
      });

      return NextResponse.json({ 
        success: true,
        userId: job.userId,
        corpEmail: result.corpEmail
      });

    } catch (error) {
      // Mark as failed, increment retry count
      await prisma.provisionJob.update({
        where: { id: job.id },
        data: { 
          status: "failed",
          error: error.message,
          retryCount: { increment: 1 }
        }
      });

      return NextResponse.json({ 
        success: false,
        error: error.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error("POST /api/provision/run error:", error);
    return NextResponse.json(
      { error: "Failed to process provision job" },
      { status: 500 }
    );
  }
}

// Placeholder - implement your provisioning logic
async function provisionUser(user: any) {
  // Your implementation here (see section below)
  throw new Error("Not implemented");
}
```

---

### 2. POST /api/esign/webhook
**Purpose:** Receive document signing events from DocuSign/BoldSign/etc  
**Auth:** Webhook signature validation  
**Called by:** E-signature provider

```typescript
// File: src/app/api/esign/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Validate webhook signature (provider-specific)
    // ... your signature validation ...

    const payload = await request.json();
    
    // Parse vendor-specific payload
    const { userId, documentType, envelopeId, status } = parseWebhookPayload(payload);

    // Update document status
    await prisma.userDocument.updateMany({
      where: { 
        userId,
        type: documentType,
        envelopeId
      },
      data: {
        status: status === "completed" ? "SIGNED" : "FAILED",
        signedAt: status === "completed" ? new Date() : null
      }
    });

    // Check if all required docs are now signed
    const requiredDocs = ["w9", "baa", "hire_agreement"];
    const signedDocs = await prisma.userDocument.findMany({
      where: {
        userId,
        type: { in: requiredDocs },
        status: "SIGNED"
      }
    });

    // If all docs signed, create provision job
    if (signedDocs.length === requiredDocs.length) {
      await prisma.provisionJob.create({
        data: {
          userId,
          status: "pending"
        }
      });

      // Update user onboarding status
      await prisma.user.update({
        where: { id: userId },
        data: { onboardStatus: "DOCS_SIGNED" }
      });
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error("POST /api/esign/webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

function parseWebhookPayload(payload: any) {
  // Implement based on your e-sign provider
  // Example for DocuSign:
  return {
    userId: payload.data.userId,
    documentType: payload.data.documentType,
    envelopeId: payload.envelopeId,
    status: payload.event === "envelope-completed" ? "completed" : "failed"
  };
}
```

---

## 🏗️ Provisioning Logic Implementation

Here's what needs to happen in `provisionUser()`:

### Step 1: Generate Corporate Email
```typescript
async function generateCorpEmail(firstName: string, lastName: string): Promise<string> {
  // Format: firstname.lastname@curagenesis.com
  const base = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, '');
  let email = `${base}@curagenesis.com`;
  
  // Check if exists
  const existing = await prisma.user.findUnique({
    where: { corpEmail: email }
  });
  
  if (existing) {
    // Add number suffix
    let counter = 1;
    while (await prisma.user.findUnique({ 
      where: { corpEmail: `${base}${counter}@curagenesis.com` } 
    })) {
      counter++;
    }
    email = `${base}${counter}@curagenesis.com`;
  }
  
  return email;
}
```

### Step 2: Create Email Account (Choose Your Method)

#### **Option A: AWS WorkMail**
```typescript
import { WorkMailClient, CreateUserCommand } from "@aws-sdk/client-workmail";

async function createWorkMailAccount(corpEmail: string, password: string) {
  const client = new WorkMailClient({ region: "us-east-1" });
  
  const [name, domain] = corpEmail.split("@");
  
  const command = new CreateUserCommand({
    OrganizationId: process.env.WORKMAIL_ORG_ID,
    Name: name,
    DisplayName: name,
    Password: password
  });
  
  await client.send(command);
  
  // WorkMail users are in format: user@curagenesis.awsapps.com
  // You need to set up email forwarding or aliases
}
```

#### **Option B: Google Workspace API**
```typescript
import { google } from 'googleapis';

async function createGoogleWorkspaceAccount(corpEmail: string, password: string, firstName: string, lastName: string) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/admin.directory.user'],
  });
  
  const admin = google.admin({ version: 'directory_v1', auth });
  
  await admin.users.insert({
    requestBody: {
      primaryEmail: corpEmail,
      name: {
        givenName: firstName,
        familyName: lastName,
      },
      password: password,
      changePasswordAtNextLogin: true
    }
  });
}
```

#### **Option C: Microsoft 365 (Azure AD)**
```typescript
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

async function createMicrosoft365Account(corpEmail: string, password: string, firstName: string, lastName: string) {
  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID!,
    process.env.AZURE_CLIENT_ID!,
    process.env.AZURE_CLIENT_SECRET!
  );
  
  const client = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken('https://graph.microsoft.com/.default');
        return token.token;
      }
    }
  });
  
  await client.api('/users').post({
    accountEnabled: true,
    displayName: `${firstName} ${lastName}`,
    mailNickname: corpEmail.split('@')[0],
    userPrincipalName: corpEmail,
    passwordProfile: {
      forceChangePasswordNextSignIn: true,
      password: password
    }
  });
}
```

### Step 3: Create CRM Access (Cognito - Optional)
```typescript
import { CognitoIdentityProviderClient, AdminCreateUserCommand } from "@aws-sdk/client-cognito-identity-provider";

async function createCognitoUser(corpEmail: string, tempPassword: string) {
  const client = new CognitoIdentityProviderClient({ region: "us-east-1" });
  
  const command = new AdminCreateUserCommand({
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: corpEmail,
    UserAttributes: [
      { Name: "email", Value: corpEmail },
      { Name: "email_verified", Value: "true" }
    ],
    TemporaryPassword: tempPassword,
    MessageAction: "SUPPRESS" // Don't send AWS email, we'll send our own
  });
  
  await client.send(command);
}
```

### Step 4: Send Welcome Email
```typescript
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

async function sendWelcomeEmail(
  personalEmail: string, 
  corpEmail: string, 
  tempPassword: string,
  firstName: string
) {
  const client = new SESClient({ region: "us-east-1" });
  
  const htmlBody = `
    <h2>Welcome to CuraGenesis, ${firstName}!</h2>
    <p>Your corporate account has been provisioned:</p>
    <ul>
      <li><strong>Corporate Email:</strong> ${corpEmail}</li>
      <li><strong>Temporary Password:</strong> ${tempPassword}</li>
      <li><strong>CRM Access:</strong> <a href="https://curagenesiscrm.com">curagenesiscrm.com</a></li>
    </ul>
    <p><strong>IMPORTANT:</strong> You will be required to change your password on first login.</p>
    <p>If you have any questions, contact your administrator.</p>
  `;
  
  const command = new SendEmailCommand({
    Source: process.env.SES_FROM_ADDRESS || "no-reply@curagenesis.com",
    Destination: { ToAddresses: [personalEmail] },
    Message: {
      Subject: { Data: "Your CuraGenesis Account is Ready" },
      Body: {
        Html: { Data: htmlBody },
        Text: { Data: `Corporate Email: ${corpEmail}\nTemporary Password: ${tempPassword}\nCRM: https://curagenesiscrm.com` }
      }
    }
  });
  
  await client.send(command);
}
```

### Step 5: Complete Provisioning Flow
```typescript
async function provisionUser(user: any) {
  const steps: any = {};
  
  try {
    // 1. Generate corporate email
    const corpEmail = await generateCorpEmail(user.firstName || user.name.split(' ')[0], user.lastName || user.name.split(' ')[1]);
    steps.corpEmail = true;
    
    // 2. Generate secure temp password
    const tempPassword = generateSecurePassword(); // Min 12 chars, mixed case, numbers, symbols
    steps.tempPassword = true;
    
    // 3. Create email account (choose your provider)
    await createGoogleWorkspaceAccount(corpEmail, tempPassword, user.firstName, user.lastName);
    // OR: await createWorkMailAccount(corpEmail, tempPassword);
    // OR: await createMicrosoft365Account(corpEmail, tempPassword, user.firstName, user.lastName);
    steps.emailAccount = true;
    
    // 4. Create Cognito user (optional, for CRM SSO)
    if (process.env.COGNITO_USER_POOL_ID) {
      await createCognitoUser(corpEmail, tempPassword);
      steps.cognitoUser = true;
    }
    
    // 5. Send welcome email to personal inbox
    await sendWelcomeEmail(user.email, corpEmail, tempPassword, user.firstName || user.name);
    steps.welcomeEmail = true;
    
    return {
      corpEmail,
      steps
    };
    
  } catch (error) {
    console.error("Provisioning error:", error);
    throw new Error(`Provisioning failed at step: ${JSON.stringify(steps)}. Error: ${error.message}`);
  }
}

function generateSecurePassword(): string {
  const length = 16;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const crypto = require('crypto');
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}
```

---

## 🔐 Environment Variables Needed

Add these to your ECS task definition / `.env`:

```bash
# Email Provider (Choose one)
## Google Workspace
GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json
GOOGLE_WORKSPACE_ADMIN_EMAIL=admin@curagenesis.com

## AWS WorkMail
WORKMAIL_ORG_ID=m-abc123def456
WORKMAIL_REGION=us-east-1

## Microsoft 365
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# AWS SES (for welcome emails)
SES_FROM_ADDRESS=no-reply@curagenesis.com
AWS_REGION=us-east-1

# AWS Cognito (optional, for CRM SSO)
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_REGION=us-east-1

# Domain
CORP_EMAIL_DOMAIN=curagenesis.com
```

---

## 📧 Email Provider Setup Guide

### **Recommended: Google Workspace**

**Why:** Best for @curagenesis.com email, familiar UI, excellent deliverability

**Setup Steps:**
1. Go to [Google Workspace Admin Console](https://admin.google.com)
2. **Enable API Access:**
   - Security → API Controls → Enable API access
3. **Create Service Account:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - IAM & Admin → Service Accounts → Create
   - Grant role: "Google Workspace Admin"
   - Create key (JSON format)
4. **Domain-wide Delegation:**
   - Copy the Client ID
   - In Workspace Admin: Security → API Controls → Domain-wide Delegation
   - Add Client ID with scope: `https://www.googleapis.com/auth/admin.directory.user`
5. **Download JSON key** and set `GOOGLE_SERVICE_ACCOUNT_KEY` env var

**Pricing:** ~$6/user/month (Business Starter)

---

### **Alternative: AWS WorkMail**

**Why:** Already in AWS ecosystem, integrated billing

**Setup Steps:**
1. Go to [AWS WorkMail Console](https://console.aws.amazon.com/workmail)
2. Create Organization:
   - Choose region (us-east-1 recommended)
   - Set domain: curagenesis.com
3. **Verify Domain:**
   - Add TXT records to DNS
   - Add MX records for email delivery
4. Note the Organization ID
5. **Set IAM Permissions:**
   - Grant ECS task role: `workmail:CreateUser`, `workmail:RegisterToWorkMail`

**Pricing:** $4/user/month

---

### **Alternative: Microsoft 365**

**Why:** Enterprise features, Outlook integration

**Setup Steps:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Azure AD → App Registrations → New
3. **Grant Permissions:**
   - User.ReadWrite.All
   - Directory.ReadWrite.All
4. Create Client Secret
5. Note: Tenant ID, Client ID, Secret

**Pricing:** ~$8/user/month (Business Basic)

---

## 🧪 Testing the Flow

### 1. Manual Test (No Frontend)
```bash
# 1. Insert test user
psql -h your-db-host -U user -d dbname -c "
INSERT INTO users (id, email, name, role, onboard_status) 
VALUES ('test-123', 'test@gmail.com', 'Test User', 'AGENT', 'DOCS_SIGNED');

INSERT INTO user_documents (id, user_id, type, status, signed_at) VALUES
('doc-1', 'test-123', 'w9', 'SIGNED', NOW()),
('doc-2', 'test-123', 'baa', 'SIGNED', NOW()),
('doc-3', 'test-123', 'hire_agreement', 'SIGNED', NOW());

INSERT INTO provision_jobs (id, user_id, status) 
VALUES ('job-1', 'test-123', 'pending');
"

# 2. Trigger provisioning
curl -X POST https://curagenesiscrm.com/api/provision/run \
  -H "Cookie: auth-token=YOUR_ADMIN_TOKEN"

# 3. Check results
psql -h your-db-host -U user -d dbname -c "
SELECT status, error, corp_email FROM provision_jobs pj
JOIN users u ON u.id = pj.user_id
WHERE pj.id = 'job-1';
"
```

### 2. End-to-End Test
1. Admin invites rep: `/recruiter/invite`
2. Rep receives email with onboarding link
3. Rep completes all 3 documents
4. E-sign webhook fires → creates ProvisionJob
5. Admin clicks "Retry Provisioning" in Hires tab
6. System provisions account
7. Rep receives welcome email with credentials
8. Rep logs into CRM with corp email

---

## 🚨 Error Handling

### Common Issues & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Email already exists` | Duplicate corp email | Add counter suffix (john.doe2@...) |
| `Insufficient permissions` | IAM/API access | Check service account permissions |
| `Domain not verified` | DNS not configured | Add MX/TXT records |
| `Password too weak` | Provider requirements | Use 16+ chars, mixed case, symbols |
| `Quota exceeded` | Too many requests | Implement rate limiting |
| `User already exists in Cognito` | Previous failed attempt | Delete old user first |

### Retry Logic
- Max 3 retries per job
- Exponential backoff: 1min, 5min, 15min
- After 3 failures, mark as permanently failed
- Admin must investigate and manually retry

---

## 📊 Monitoring & Logging

### Key Metrics to Track
1. **Provision Success Rate:** `success / (success + failed)`
2. **Average Provision Time:** Time from docs signed → email sent
3. **Error Rate by Step:** Which step fails most often
4. **Retry Rate:** How many jobs need retries

### CloudWatch Alarms (Recommended)
```typescript
// Alert if provision failure rate > 10%
// Alert if provision time > 5 minutes
// Alert if retry count > 50% of total jobs
```

### Log Format
```json
{
  "timestamp": "2025-10-13T10:30:00Z",
  "event": "provision_started",
  "userId": "user-123",
  "jobId": "job-456",
  "attempt": 1
}
```

---

## 🎯 Success Criteria

✅ **Provisioning works end-to-end:**
- Documents signed → Job created
- Job processed → Email created
- Welcome email sent → Rep receives credentials

✅ **Error handling:**
- Failed provisions show error in Hires tab
- Retry button processes failed jobs
- Errors logged for debugging

✅ **Security:**
- Temp passwords are strong (16+ chars)
- Credentials sent only to personal email
- Force password change on first login

✅ **Integration:**
- CRM Hires tab shows live status
- Auto-refresh picks up changes
- Corp email appears once provisioned

---

## 📞 Support & Questions

**Frontend is ready:** v16 deployed, waiting for backend  
**Frontend contact:** Alex Siegel (asiegel@curagenesis.com)  
**This document location:** `/PROVISIONING_BACKEND_HANDOFF.md`

**When backend is ready:**
1. Run database migration (add `provision_jobs` table)
2. Implement `/api/provision/run` endpoint
3. Implement `/api/esign/webhook` endpoint
4. Configure email provider (Google/WorkMail/M365)
5. Set environment variables
6. Test with manual job first
7. Deploy and verify in Hires tab

---

## 🔗 Related Documentation

- `RECRUIT_HIRES_FEATURE.md` - Frontend implementation details
- `API_MIGRATION_SUMMARY.md` - CuraGenesis API integration
- `RUN_THIS_MIGRATION.md` - Database migration guide

---

**Ready to implement? The frontend is waiting! 🚀**

