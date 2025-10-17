# CuraGenesis CRM → Backend API Integration - Handoff Document

**Date:** October 17, 2025  
**From:** Alex Siegel - CRM Team  
**To:** CuraGenesis Backend/API Team  
**Subject:** Practice Submission Integration - Production Ready

---

## 🎯 EXECUTIVE SUMMARY

The **CuraGenesis CRM** is now successfully submitting practice data to your external API endpoint. This document explains what we're doing, what data we're sending, and what you need to do with it.

**Current Status:** ✅ Integration Working - HTTP 200 Success

---

## 📋 WHAT IS THE CRM?

The CuraGenesis CRM is a **sales intake system** for our field sales team (reps/agents). It allows reps to:

1. **Capture practice information** during sales calls/meetings
2. **Collect practice details** (name, NPI, address, contacts, etc.)
3. **Submit practices to your system** for onboarding
4. **Track submission status** and follow up

**Goal:** Get practices enrolled in CuraGenesis faster by having reps pre-populate their information.

---

## 🔄 THE WORKFLOW

### Step 1: Sales Rep Collects Practice Info (CRM)
- Rep meets with practice (doctor's office, clinic, etc.)
- Rep enters practice details into CRM:
  - Practice name, specialty, NPI, TIN
  - Contact person (usually office manager or doctor)
  - Address, phone, email
  - Primary contact name and position

### Step 2: Rep Submits to CuraGenesis (CRM → Your API)
- Rep clicks "Send to Practice" in CRM
- CRM calls: `POST https://ix0n88n8ze.execute-api.us-east-2.amazonaws.com/prod/admin_createUserWithBaa`
- Sends complete practice data as JSON

### Step 3: Your System Processes (Your Responsibility)
**What you should do:**
1. ✅ **Create practice user account** in your database
2. ✅ **Generate magic link** for practice onboarding
3. ✅ **Send welcome email** to practice contact with magic link
4. ✅ **Return success** with userId

**What you should NOT do:**
- ❌ Don't create WorkMail accounts (practices don't need @curagenesis.com emails)
- ❌ Don't create internal system accounts (that's for reps only)

### Step 4: Practice Completes Onboarding (Your Portal)
- Practice contact receives email with magic link
- Clicks link → Goes to your onboarding portal
- Completes profile, signs BAA, adds payment info
- Becomes active customer

---

## 📡 API INTEGRATION DETAILS

### Endpoint
```
POST https://ix0n88n8ze.execute-api.us-east-2.amazonaws.com/prod/admin_createUserWithBaa
```

### Headers
```http
Content-Type: application/json
x-vendor-token: Nb9sQCZnrAxAxS4KrysMLzRUQ2HN21hbZmpshgZYb1cT7sEPdJkNEE_MhfB59pDt
x-api-key: DDi4EEcXyx1q6UcQc4ezX6mlhaoNo7Lo9q7SO1en
Idempotency-Key: <uuid>
```

### Request Payload Format
```json
{
  "source_system": "intake_crm",
  "submitted_at": "2025-10-17T01:17:42.950Z",
  "rep": {
    "id": "e8c6d7b0-5846-47ea-b749-5a9b86f99ef2",
    "name": "Alex Siegel",
    "email": "asiegel@curagenesis.com"
  },
  "practice": {
    "name": "ABC Medical Center",
    "specialty": "Family Medicine",
    "state": "TX",
    "npi_org": "1234567890",
    "ein_tin": "123456789",
    "phone": "+15125551234",
    "email": "contact@practice.com",
    "website": "https://practice.com",
    "ehr_system": "Epic",
    "lead_source": "Referral",
    "address": {
      "line1": "123 Main Street",
      "line2": "Suite 100",
      "city": "Austin",
      "state": "TX",
      "zip": "78701"
    }
  },
  "contacts": [
    {
      "contact_type": "clinical",
      "full_name": "Dr. Jane Smith",
      "npi_individual": "9876543210",
      "title": "Medical Director",
      "email": "jsmith@practice.com",
      "phone": "+15125559999",
      "preferred_contact_method": "email"
    }
  ],
  "primaryContactName": "Dr. Jane Smith",
  "primaryContactPosition": "Medical Director"
}
```

### Expected Response (Success)
```json
{
  "success": true,
  "message": "Practice account created successfully",
  "data": {
    "userId": "auth0|1234567890abcdef",
    "magicLink": "https://portal.curagenesis.com/onboard?token=...",
    "emailSent": true
  }
}
```

### Expected Response (Error)
```json
{
  "success": false,
  "error": "Validation failed",
  "details": "Practice email already exists"
}
```

---

## 📊 FIELD DEFINITIONS

### Required Fields (Will Always Be Present)
- ✅ `rep.id` - Our CRM user ID for the sales rep
- ✅ `rep.name` - Sales rep's full name
- ✅ `rep.email` - Sales rep's email (@curagenesis.com)
- ✅ `practice.name` - Practice/clinic name
- ✅ `practice.specialty` - Medical specialty
- ✅ `practice.state` - 2-letter state code (e.g., "TX", "CA")
- ✅ `practice.address.line1` - Street address
- ✅ `practice.address.city` - City name
- ✅ `practice.address.state` - State code
- ✅ `practice.address.zip` - ZIP code
- ✅ `source_system` - Always "intake_crm"
- ✅ `submitted_at` - ISO timestamp

### Optional Fields (May Be Null)
- `practice.npi_org` - 10-digit organizational NPI
- `practice.ein_tin` - 9-digit Tax ID
- `practice.phone` - E.164 format (e.g., "+15125551234")
- `practice.email` - Practice contact email
- `practice.website` - Practice website URL
- `practice.ehr_system` - EHR system name (e.g., "Epic", "Cerner")
- `practice.lead_source` - How we found them (e.g., "Referral", "Cold Call")
- `practice.address.line2` - Apt/Suite number
- `primaryContactName` - Main contact person
- `primaryContactPosition` - Their title (e.g., "Office Manager")
- `contacts[]` - Array of additional contacts (providers, admins, etc.)

### Contact Types
When `contacts` array is populated, each contact has:
- `contact_type`: "clinical", "provider", "admin", or "billing"
- `full_name`: Person's full name
- `npi_individual`: 10-digit individual NPI (for physicians)
- `title`: Job title
- `email`: Contact email
- `phone`: Contact phone
- `preferred_contact_method`: "email", "phone", or "both"

---

## 🎯 WHAT YOU NEED TO DO

### 1. Create Practice User Account
When you receive a practice submission:

```javascript
// Pseudocode
const practice = requestBody.practice;
const rep = requestBody.rep;

// Create user in your Auth0/Cognito/database
const userId = await createUser({
  email: practice.email || requestBody.primaryContactEmail,
  firstName: extractFirstName(requestBody.primaryContactName),
  lastName: extractLastName(requestBody.primaryContactName),
  userType: 'PRACTICE',
  practiceInfo: {
    name: practice.name,
    npi: practice.npi_org,
    tin: practice.ein_tin,
    specialty: practice.specialty,
    address: practice.address,
    phone: practice.phone
  },
  metadata: {
    submittedBy: rep.email,
    submittedByRepId: rep.id,
    submittedAt: requestBody.submitted_at,
    sourceSystem: 'intake_crm'
  }
});
```

### 2. Generate Magic Link
```javascript
const token = generateSecureToken();
const magicLink = `https://portal.curagenesis.com/onboard?token=${token}`;

await saveMagicLinkToken({
  userId,
  token,
  expiresAt: Date.now() + (72 * 60 * 60 * 1000) // 72 hours
});
```

### 3. Send Welcome Email to Practice
**Send to:** `practice.email` or the first contact's email

**Email content should include:**
- Welcome message
- Practice name and details (for verification)
- Magic link to complete onboarding
- Expiration notice (72 hours)
- Support contact

**Example:**
```
Subject: Complete Your CuraGenesis Account Setup - [Practice Name]

Hi [Primary Contact Name],

Your CuraGenesis account has been set up by your sales representative [Rep Name].

Practice: [Practice Name]
Contact: [Primary Contact Name] - [Position]

Click the link below to complete your onboarding:
[Magic Link - expires in 72 hours]

During onboarding you'll:
- Verify your practice information
- Sign Business Associate Agreement (BAA)
- Set up your account credentials
- Add payment information

Questions? Contact: support@curagenesis.com

Thanks,
CuraGenesis Team
```

### 4. Return Success Response
```json
{
  "success": true,
  "message": "Practice account created successfully",
  "data": {
    "userId": "auth0|abc123",
    "practiceId": "FAC-XXXX-YYYY-ZZZZ",
    "magicLinkSent": true,
    "emailSentTo": "contact@practice.com"
  }
}
```

---

## ⚠️ IMPORTANT NOTES

### DO NOT Create WorkMail Accounts
- ❌ **Practices** do NOT need @curagenesis.com email addresses
- ❌ **Practices** use their own business email
- ✅ **Only internal reps/agents** get @curagenesis.com WorkMail accounts
- ✅ **WorkMail creation** happens in Admin → Recruitment tool (separate endpoint)

### Handle Duplicates
- Check if practice.email or practice.npi_org already exists
- Return 409 Conflict if duplicate found
- Include details about existing practice in error response

### Store Sales Rep Attribution
**CRITICAL:** Track which rep submitted each practice!

```sql
-- Your practice/facilities table should have:
ALTER TABLE practices ADD COLUMN submitted_by_rep_email VARCHAR(255);
ALTER TABLE practices ADD COLUMN submitted_by_rep_id VARCHAR(255);
ALTER TABLE practices ADD COLUMN submitted_at TIMESTAMPTZ;
ALTER TABLE practices ADD COLUMN source_system VARCHAR(50);
```

**Why this matters:**
- Commission tracking (reps get paid for practices they sign up)
- Performance metrics (which reps are most successful)
- Support routing (route questions to the rep who knows the practice)
- Relationship management (rep owns the practice account)

---

## 🧪 TESTING

### Test Payload (Use This)
```json
{
  "source_system": "intake_crm",
  "submitted_at": "2025-10-17T01:00:00.000Z",
  "rep": {
    "id": "test-rep-123",
    "name": "Test Rep",
    "email": "test.rep@curagenesis.com"
  },
  "practice": {
    "name": "Test Medical Clinic",
    "specialty": "Family Medicine",
    "state": "TX",
    "npi_org": "1234567890",
    "ein_tin": "123456789",
    "phone": "+15125551234",
    "email": "test@testclinic.com",
    "address": {
      "line1": "123 Test St",
      "line2": "Suite 100",
      "city": "Austin",
      "state": "TX",
      "zip": "78701"
    },
    "lead_source": "Referral"
  },
  "contacts": [],
  "primaryContactName": "Dr. Test Doctor",
  "primaryContactPosition": "Medical Director"
}
```

### Test Commands
```bash
# Test your endpoint
curl -X POST https://ix0n88n8ze.execute-api.us-east-2.amazonaws.com/prod/admin_createUserWithBaa \
  -H "Content-Type: application/json" \
  -H "x-vendor-token: Nb9sQCZnrAxAxS4KrysMLzRUQ2HN21hbZmpshgZYb1cT7sEPdJkNEE_MhfB59pDt" \
  -H "x-api-key: DDi4EEcXyx1q6UcQc4ezX6mlhaoNo7Lo9q7SO1en" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d @test-payload.json
```

### Expected Behavior
1. ✅ Receive JSON payload
2. ✅ Validate required fields (practice.name, practice.email, rep.name, rep.email)
3. ✅ Check for duplicates (NPI or email)
4. ✅ Create practice user account
5. ✅ Generate and save magic link token
6. ✅ Send email to practice.email with magic link
7. ✅ Store rep attribution (submitted_by_rep_email, submitted_by_rep_id)
8. ✅ Return success response with userId

---

## 🚨 CURRENT ISSUE TO FIX

### WorkMail Creation Errors
Your Lambda is currently trying to create WorkMail accounts and failing:

```
Failed to create practice WorkMail account: getaddrinfo ENOTFOUND workmail.us-east-2.amazonaws.com
Failed to create rep WorkMail account: getaddrinfo ENOTFOUND workmail.us-east-2.amazonaws.com
```

**Fix Required:**
1. **Remove WorkMail creation code** from this Lambda
2. **Only send the magic link email** to the practice contact
3. **WorkMail accounts** are created separately via Admin → Recruitment tool (for internal reps only)

### Why Practices Don't Need WorkMail
- Practices are **external customers**
- They use their own business email addresses
- They don't need @curagenesis.com emails
- Only internal employees (reps, agents, admin) get WorkMail

---

## 📧 EMAIL REQUIREMENTS

### Who Receives the Email?
Send to: `practice.email` (primary) or first contact's email

### What Should the Email Contain?

```
To: practice.email
From: noreply@curagenesis.com
Subject: Complete Your CuraGenesis Account - [Practice Name]

---

Hi [primaryContactName],

Welcome to CuraGenesis! Your account has been set up by your sales representative, [rep.name].

PRACTICE INFORMATION:
- Name: [practice.name]
- Specialty: [practice.specialty]
- Location: [practice.city], [practice.state]
- Contact: [primaryContactName] - [primaryContactPosition]

NEXT STEPS:
Click the link below to complete your account setup:
[Magic Link] (expires in 72 hours)

You'll be able to:
✓ Review and confirm your practice details
✓ Sign the Business Associate Agreement (BAA)
✓ Set up your account credentials
✓ Configure billing and payment
✓ Start ordering products

NEED HELP?
Contact your sales representative:
[rep.name] - [rep.email]

Or reach out to our support team:
support@curagenesis.com

Thanks,
The CuraGenesis Team

---

This email was sent to [practice.email] because your practice was registered 
by [rep.name] on [submitted_at].
```

### Email Template Variables
Use these fields from the payload:
- `practice.name` - Practice name
- `practice.specialty` - Specialty
- `practice.city`, `practice.state` - Location
- `primaryContactName` - Person to address email to
- `primaryContactPosition` - Their role/title
- `rep.name` - Sales rep who submitted
- `rep.email` - Rep's contact email
- `submitted_at` - When it was submitted

---

## 🔐 SECURITY & DATA HANDLING

### Idempotency
- We send `Idempotency-Key` header with each request
- Use this to prevent duplicate submissions
- If you receive the same key twice, return the original response

### Data Retention
- **Store the rep attribution** (rep.id, rep.email) with each practice
- This is critical for commission tracking and support
- Don't discard this data

### Validation
**You should validate:**
- ✅ `practice.name` is present and non-empty
- ✅ `practice.email` is valid email format
- ✅ `practice.state` is valid 2-letter US state code
- ✅ `practice.npi_org` is 10 digits (if provided)
- ✅ `practice.ein_tin` is 9 digits (if provided)
- ✅ `rep.email` is a valid @curagenesis.com email

**Return specific validation errors:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "practice.email": "Invalid email format",
    "practice.npi_org": "NPI must be exactly 10 digits"
  }
}
```

---

## 📊 WHAT WE TRACK IN CRM

After you respond, we store:
- Submission status (SUCCESS or FAILED)
- HTTP status code
- Your response data (userId, etc.)
- Timestamp
- Any error messages

This helps reps:
- See which practices are pending onboarding
- Follow up with practices who haven't completed setup
- Track their pipeline

---

## 🎯 SUCCESS METRICS

### What Success Looks Like
1. ✅ CRM submits practice → HTTP 200 response
2. ✅ Practice user created in your database
3. ✅ Magic link email sent to practice contact
4. ✅ Practice receives email within 2 minutes
5. ✅ Practice clicks link and completes onboarding
6. ✅ Practice becomes active customer
7. ✅ Rep gets credit for the sale

### Common Failure Scenarios
- **409 Duplicate** - Practice already exists (check by email or NPI)
- **400 Validation** - Missing required fields or invalid format
- **500 Server Error** - Your backend issue
- **503 Unavailable** - Your service is down

**We handle all these gracefully** and show appropriate messages to reps.

---

## 🔧 BACKEND CHECKLIST

### Before Going Live
- [ ] Remove WorkMail creation code from Lambda
- [ ] Add email sending logic (SES or similar)
- [ ] Create email template with magic link
- [ ] Test email delivery to external addresses
- [ ] Add rep attribution fields to practice table
- [ ] Implement duplicate detection (NPI, email)
- [ ] Test idempotency with same key twice
- [ ] Handle validation errors gracefully
- [ ] Set up CloudWatch alerts for failures
- [ ] Test with the sample payload above

### Deployment
- [ ] Deploy updated Lambda function
- [ ] Test endpoint with curl
- [ ] Verify email is sent and received
- [ ] Check magic link works
- [ ] Confirm practice can complete onboarding
- [ ] Notify CRM team it's ready for production

---

## 📞 COORDINATION

### CRM Team Contact
- **Name:** Alex Siegel
- **Email:** asiegel@curagenesis.com
- **Slack:** @alex (if applicable)

### What We Need From You
1. **Confirmation** when Lambda is updated (WorkMail removed, email added)
2. **Test results** after you deploy
3. **Example magic link** so we can verify the flow
4. **Any payload changes** you need (let us know and we'll adjust)

### Timeline
- **CRM Status:** ✅ Production ready NOW
- **Waiting On:** Backend Lambda updates (email sending)
- **Target:** ASAP - sales team is waiting

---

## 🎓 UNDERSTANDING THE BIGGER PICTURE

### Why This Integration Matters
- **Sales efficiency:** Reps can submit practices immediately after meetings
- **Data quality:** All practice info pre-populated by reps who know them
- **Faster onboarding:** Practice receives email right away instead of waiting
- **Commission tracking:** Reps get credit for practices they bring in
- **Customer experience:** Practices get personalized welcome from their rep

### What Happens Next (Your Portal)
1. Practice clicks magic link in email
2. Lands on your onboarding portal
3. Reviews pre-filled practice information
4. Signs BAA electronically
5. Sets password and security questions
6. Adds payment method
7. Becomes active → Can start ordering

### Integration Points
- **CRM → Your API:** Practice submission (this document)
- **Your Portal → Practice:** Magic link onboarding
- **Your System → CRM:** Webhook for practice activation status (future)
- **Your System → CRM:** Order data for rep metrics (existing - working)

---

## 📝 REVISION HISTORY

| Date | Change | Status |
|------|--------|--------|
| 2025-10-17 | Integration working - HTTP 200 success | ✅ Complete |
| 2025-10-16 | Endpoint updated to ix0n88n8ze API | ✅ Complete |
| 2025-10-16 | Payload format confirmed (practice/rep objects) | ✅ Complete |
| 2025-10-13 | Initial integration attempt | ❌ Failed (wrong endpoint) |

---

## ✅ ACCEPTANCE CRITERIA

We consider this integration complete when:

- [x] CRM successfully submits practice data (HTTP 200)
- [x] Correct endpoint being called
- [x] Correct payload format
- [ ] **Backend sends magic link email** ← YOU NEED TO DO THIS
- [ ] Practice receives email
- [ ] Practice can click magic link and onboard
- [ ] Rep attribution stored in your database
- [ ] No WorkMail creation errors

**Current Status:** 5 out of 8 complete. Waiting on backend email implementation.

---

## 🚀 PRODUCTION READINESS

### CRM Side: ✅ READY
- All code deployed and tested
- Submissions working (HTTP 200)
- Error handling in place
- Logging comprehensive
- Rep attribution included

### Backend Side: ⚠️ NEEDS WORK
- Lambda receiving data correctly ✅
- WorkMail errors need to be removed ❌
- Email sending needs to be implemented ❌
- Rep attribution needs to be stored ❌

---

## 📞 NEXT STEPS

1. **Backend Team:** Update Lambda (remove WorkMail, add email)
2. **Backend Team:** Test and confirm email delivery
3. **Backend Team:** Share example magic link
4. **CRM Team:** Test end-to-end with real practice
5. **Both Teams:** Monitor first production submissions
6. **Both Teams:** Verify practice completes onboarding

---

**Thank you for your collaboration! We're almost there.** 🎉

Let us know when the Lambda is updated and we'll do end-to-end testing together.

