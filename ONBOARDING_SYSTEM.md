# 🚀 Onboarding System Documentation

## Overview

The CuraGenesis CRM includes a comprehensive onboarding system for new sales reps. This system ensures compliance with HIPAA regulations and tax requirements before granting access to the CRM.

---

## ✅ Features

### Admin Features

1. **Single Invite**
   - Invite one rep at a time
   - Generates secure temp password
   - Creates unique invite token
   - 7-day expiration

2. **Bulk Upload**
   - CSV format: `firstName,lastName,email`
   - Processes multiple invites
   - Shows success/failure summary
   - Console logging for all credentials

### New Rep Experience

1. **Welcome Email** (Demo Mode: Console)
   - Invite link with token
   - Temporary password
   - Name and email confirmation

2. **Onboarding Page** (`/onboard-rep?token=...`)
   - Token verification
   - BAA (Business Associate Agreement)
   - W9 (IRS Form W-9)
   - Must accept both to continue
   - Auto-redirect to login after completion

3. **Documents Page** (`/documents`)
   - View onboarding status
   - Access completed documents
   - Download documents (placeholder)

---

## 📊 Database Schema

### User Model Extensions

```prisma
model User {
  // Onboarding fields
  tempPassword          String?   
  passwordResetRequired Boolean   @default(false)
  baaCompleted          Boolean   @default(false)
  baaCompletedAt        DateTime?
  w9Completed           Boolean   @default(false)
  w9CompletedAt         DateTime?
  onboardedAt           DateTime? // Set when both BAA & W9 complete
}
```

### InviteToken Model

```prisma
model InviteToken {
  id           String    @id @default(uuid())
  email        String
  name         String
  token        String    @unique
  tempPassword String
  used         Boolean   @default(false)
  expiresAt    DateTime  // 7 days from creation
  createdById  String
}
```

### Document Model

```prisma
model Document {
  id       String         @id @default(uuid())
  userId   String
  type     DocumentType   // baa, w9, contract, other
  fileName String
  status   DocumentStatus // pending, uploaded, signed, approved, rejected
  signedAt DateTime?
}
```

---

## 🔄 Onboarding Flow

```
┌─────────────────────────────────────────────────────────┐
│ ADMIN: Send Invite                                      │
│ • Single or Bulk                                        │
│ • Generates token & temp password                       │
│ • Creates InviteToken record                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ EMAIL/CONSOLE: Welcome Message                          │
│ • Invite Link: /onboard-rep?token=xxx                   │
│ • Temp Password: xxxxxx                                 │
│ • Expires: 7 days                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ REP: Onboarding Page                                    │
│ 1. Verify token (not expired, not used)                 │
│ 2. Display welcome with credentials                     │
│ 3. Show BAA document (placeholder)                      │
│ 4. Show W9 form (placeholder)                           │
│ 5. Require checkbox acceptance for both                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ API: Complete Onboarding                                │
│ • Create User record (role: rep)                        │
│ • Set baaCompleted = true                               │
│ • Set w9Completed = true                                │
│ • Set onboardedAt = now()                               │
│ • Create Document records (BAA, W9)                     │
│ • Mark InviteToken as used                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ REP: Login & Access CRM                                 │
│ • Email: from invite                                    │
│ • Password: temp password                               │
│ • Middleware allows access (onboardedAt != null)        │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### Admin Routes

#### POST `/api/admin/invite`
Send single invite.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "invite": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "inviteLink": "https://app.com/onboard-rep?token=...",
    "tempPassword": "abc123xyz",
    "expiresAt": "2025-10-15T12:00:00Z"
  }
}
```

#### POST `/api/admin/invite-bulk`
Send bulk invites via CSV.

**Request:**
```json
{
  "invites": [
    { "firstName": "John", "lastName": "Doe", "email": "john@example.com" },
    { "firstName": "Jane", "lastName": "Smith", "email": "jane@example.com" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "successful": [ /* array of invite objects */ ],
    "failed": [ 
      { "email": "duplicate@example.com", "reason": "User already exists" }
    ]
  }
}
```

#### GET `/api/admin/documents/[userId]`
Get documents for any user (admin only).

**Response:**
```json
{
  "success": true,
  "user": { /* user details */ },
  "documents": [ /* array of document objects */ ]
}
```

### Onboarding Routes

#### POST `/api/onboarding/verify-token`
Verify invite token validity.

**Request:**
```json
{
  "token": "abc123..."
}
```

**Response:**
```json
{
  "success": true,
  "invite": {
    "name": "John Doe",
    "email": "john@example.com",
    "tempPassword": "abc123xyz",
    "expiresAt": "2025-10-15T12:00:00Z"
  }
}
```

#### POST `/api/onboarding/complete`
Complete onboarding (accept BAA & W9).

**Request:**
```json
{
  "token": "abc123...",
  "baaAccepted": true,
  "w9Accepted": true
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "baaCompleted": true,
    "w9Completed": true,
    "onboardedAt": "2025-10-08T12:00:00Z",
    "needsPasswordReset": true
  }
}
```

### Documents Routes

#### GET `/api/documents/my`
Get current user's documents.

**Response:**
```json
{
  "success": true,
  "documents": [
    {
      "id": "uuid",
      "type": "baa",
      "fileName": "BAA_Agreement.pdf",
      "status": "signed",
      "signedAt": "2025-10-08T12:00:00Z",
      "createdAt": "2025-10-08T12:00:00Z"
    }
  ]
}
```

---

## 🧪 Testing the System

### 1. Admin Sends Invite

```bash
# Login as admin
Email: admin@curagenesis.com
Password: anything (demo mode)

# Navigate to Admin page
# Click "Invite Single" or "Bulk Upload"
# Fill form and submit
# Check browser console for invite details
```

### 2. Rep Onboards

```bash
# Copy invite link from console
# Example: http://localhost:30003/onboard-rep?token=abc123...

# Paste in browser
# View credentials (name, email, temp password)
# Read BAA and W9
# Check both acceptance boxes
# Click "Complete Onboarding"
# Redirected to login automatically
```

### 3. Rep Logs In

```bash
# Use credentials from onboarding:
Email: [from invite]
Password: [temp password from invite]

# Should login successfully
# Navigate to Documents page
# See completed BAA & W9
```

### 4. Admin Views Rep Documents

```bash
# Login as admin
# Navigate to Admin page
# View user list (shows onboarding status)
# Access /api/admin/documents/[userId] to see rep's docs
```

---

## 📝 CSV Format for Bulk Upload

```csv
firstName,lastName,email
John,Doe,john@example.com
Jane,Smith,jane@example.com
Mike,Johnson,mike@example.com
```

**Important:**
- No header row
- Comma-separated values
- One rep per line
- Email must be unique

**In Admin UI:**
```
Paste CSV data directly into textarea:
John,Doe,john@example.com
Jane,Smith,jane@example.com
Mike,Johnson,mike@example.com
```

---

## 🔐 Security Features

1. **Token Security**
   - 32-byte random hex tokens
   - 7-day expiration
   - One-time use only
   - Marked as used after onboarding

2. **Password Security**
   - Secure random password generation
   - 12 characters (alphanumeric)
   - Password reset required on first login
   - No special characters (better UX)

3. **Validation**
   - Email uniqueness check
   - Token expiration check
   - Token usage check
   - Required field validation

4. **Access Control**
   - Admin-only invite routes
   - Reps can only view own documents
   - Admins can view all documents
   - Middleware onboarding checks (production)

---

## 🚀 Production Deployment

### 1. Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Run migration
npx prisma migrate deploy

# Or for dev
npx prisma db push
```

### 2. Environment Variables

```bash
# Required (already in .env)
DATABASE_URL=postgresql://...
NEXT_PUBLIC_APP_URL=https://your-domain.com  # For invite links
```

### 3. Enable Middleware (Production Only)

In `src/middleware.ts`, uncomment the production auth logic:

```typescript
// Remove demo bypass
// Uncomment production logic
// Enables onboarding completion checks
```

### 4. Email Integration

In production, replace console logging with actual email:

**`src/app/api/admin/invite/route.ts`:**
```typescript
// Instead of console.log, send email:
await sendEmail({
  to: email,
  subject: "Welcome to CuraGenesis CRM",
  template: "welcome",
  data: {
    name: `${firstName} ${lastName}`,
    inviteLink,
    tempPassword,
  },
});
```

### 5. Document Storage

In production, implement actual file uploads:

- Use AWS S3 for document storage
- Update Document model with `fileUrl`
- Implement signed URLs for downloads
- Add file size limits
- Validate file types (PDF only)

---

## 📌 Current Status (Demo Mode)

✅ **Working:**
- Admin can send invites (single & bulk)
- Invite tokens generated
- Onboarding page functional
- BAA & W9 acceptance flow
- Document records created
- Auto-redirect to login
- Documents page displays status

⏳ **Demo Mode:**
- Credentials logged to console (not emailed)
- Middleware bypassed (no auth enforcement)
- Documents are placeholders (no file upload)
- Uses localStorage for demo user roles

🔜 **Production TODO:**
- Enable middleware auth checks
- Implement email service
- Add file upload for documents
- Add password reset flow
- Add invite resend functionality
- Add document download with signed URLs

---

## 🎯 Key Files

### API Routes
- `/src/app/api/admin/invite/route.ts` - Single invite
- `/src/app/api/admin/invite-bulk/route.ts` - Bulk invites
- `/src/app/api/onboarding/verify-token/route.ts` - Token verification
- `/src/app/api/onboarding/complete/route.ts` - Complete onboarding
- `/src/app/api/documents/my/route.ts` - Rep documents
- `/src/app/api/admin/documents/[userId]/route.ts` - Admin document access

### UI Pages
- `/src/app/onboard-rep/page.tsx` - Onboarding page
- `/src/app/documents/page.tsx` - Documents page
- `/src/components/admin/admin-content.tsx` - Admin invite forms
- `/src/components/documents/documents-content.tsx` - Documents list

### Data
- `/prisma/schema.prisma` - Database schema

### Auth
- `/src/middleware.ts` - Route protection
- `/src/hooks/use-current-user.ts` - User session hook

---

## 💡 Usage Examples

### Admin: Single Invite

1. Login as admin
2. Go to Admin page
3. Click "Invite Single"
4. Fill in:
   - First Name: John
   - Last Name: Doe
   - Email: john@example.com
5. Click "Send Invite"
6. Copy invite link from console
7. Share with new rep

### Admin: Bulk Upload

1. Login as admin
2. Go to Admin page
3. Click "Bulk Upload"
4. Paste CSV data:
   ```
   John,Doe,john@example.com
   Jane,Smith,jane@example.com
   Mike,Johnson,mike@example.com
   ```
5. Click "Send Bulk Invites"
6. Check console for all invite links
7. View success/failure summary

### Rep: Complete Onboarding

1. Receive invite link (or get from console)
2. Visit: `/onboard-rep?token=...`
3. Verify your info is correct
4. Read BAA document
5. Check "I have read and agree to the Business Associate Agreement"
6. Read W9 form
7. Check "I have read and agree to the W9 form"
8. Click "Complete Onboarding"
9. Wait for redirect to login
10. Login with provided credentials

---

## 🐛 Troubleshooting

### Invite Token Not Found
- Token may have expired (7 days)
- Token may have already been used
- Check token in URL is complete

### Can't Complete Onboarding
- Both BAA and W9 must be checked
- Token must be valid
- Check console for errors

### Documents Not Showing
- Complete onboarding first
- Documents created after BAA/W9 acceptance
- Refresh page if needed

### Console Logs Not Showing
- Open browser DevTools (F12)
- Check Console tab
- Look for 📧 emoji markers

---

## 🎉 Success Indicators

✅ Invite Sent:
```
📧 INVITE CREATED:
Invite Link: http://localhost:30003/onboard-rep?token=...
Temp Password: abc123xyz
```

✅ Onboarding Complete:
```
🎉 ONBOARDING COMPLETE
Email: john@example.com
Temp Password: abc123xyz
Login URL: http://localhost:30003/login
```

✅ Rep Login Success:
```
✅ Welcome to CuraGenesis
Logged in as Sales Agent
```

---

## 📚 Related Documentation

- [RBAC_IMPLEMENTATION.md](./RBAC_IMPLEMENTATION.md) - Role-based access control
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - AWS deployment
- [README.md](./README.md) - General setup
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Testing procedures

---

## 🔗 Quick Links

- Onboarding Page: `/onboard-rep?token=YOUR_TOKEN`
- Documents Page: `/documents`
- Admin Page: `/admin`
- Login Page: `/login`

---

**Built with ❤️ for CuraGenesis**

