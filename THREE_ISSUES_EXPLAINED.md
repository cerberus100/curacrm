# Three Issues Explained & Fixed

## Date: October 13, 2025, 2:15 PM

---

## 1. ✅ **SUBMISSIONS TAB** - What It's For

### Purpose:
The **Submissions** tab shows the **history of practices sent to CuraGenesis**.

### What It Shows:
- **Each submission** = one account sent to CuraGenesis via API
- **Status**: SUCCESS, FAILED, or PENDING
- **HTTP Code**: Response code from CuraGenesis API
- **Practice Name**: Which account was sent
- **Timestamp**: When it was sent
- **Error Message**: If it failed, why
- **Full Request/Response**: Detailed logs

### How It Works:
1. Agent creates account in Intake
2. Agent clicks "Send to CuraGenesis"
3. System calls `/admin_createUserWithBaa` API
4. **Submission record created** with all details
5. Shows up in Submissions tab

### For Agents:
- See **only their own** submissions
- Track which practices were successfully sent
- View error details if something failed
- Retry failed submissions

### For Admin:
- See **all** submissions from all agents
- Monitor API integration health
- Track success/failure rates
- Troubleshoot integration issues

---

## 2. ✅ **LEAD SOURCE** - Now a Dropdown (Fixed in v21)

### What Changed:
**BEFORE**: Free-text input field  
**AFTER**: Dropdown select with predefined options

### Options Include:
- Referral
- Conference
- Trade Show
- Website
- Cold Call
- Email Campaign
- Social Media
- Partner Network
- Industry Event
- Direct Mail
- Online Search
- Other

### Why This Is Better:
- ✅ Consistent data (no typos, variations)
- ✅ Easier to filter and report
- ✅ Better analytics
- ✅ Guided input for users

### Code Changes:
- Added `LEAD_SOURCES` constant in `src/lib/constants.ts`
- Changed from `<Input>` to `<Select>` in account form
- Dropdown renders predefined options

---

## 3. ❌ **EMAIL NOT SENT** - Why You Didn't Get an Email

### The Issue:
When you "Send to CuraGenesis", the CRM:
1. ✅ **Saves account** to your PostgreSQL database
2. ✅ **Calls CuraGenesis API** (`/admin_createUserWithBaa`)
3. ❓ **CuraGenesis API** is supposed to send the signup email

### Why No Email:
The email is sent **by CuraGenesis backend**, not by your CRM.

Possible reasons you didn't receive it:
1. **CuraGenesis API might not be sending emails yet** (test/dev mode)
2. **Email went to spam** (check spam folder)
3. **API call failed** (check Submissions tab for errors)
4. **CuraGenesis email service not configured** for the new API endpoint
5. **Your email not in their system** as an allowed recipient

### How to Check:
1. Go to **Submissions** tab
2. Find your submission
3. Look at:
   - **Status**: Should be "SUCCESS"
   - **HTTP Code**: Should be 200 or 201
   - **Response**: Should have `userId` or `success: true`
   - **Error Message**: If failed, shows why

### What CuraGenesis API Should Do:
According to the API docs (`/admin_createUserWithBaa`):
- Creates user account in CuraGenesis system
- Seeds BAA (Business Associate Agreement) data
- **Sends welcome email** with login link
- **Sends BAA email** for signature

### Action Items:
1. ✅ **Check Submissions tab** - Did the API call succeed?
2. ✅ **Check spam folder** - Email might be filtered
3. ✅ **Contact CuraGenesis dev team** - Ask if:
   - Emails are enabled for `/admin_createUserWithBaa` endpoint
   - There's a test mode that suppresses emails
   - Your email needs to be allowlisted
   - Email templates are configured for the new endpoint

---

## 📧 Email to CuraGenesis Dev Team:

```
Subject: Email Not Being Sent from /admin_createUserWithBaa

Hi Team,

I'm testing the new Partner CRM integration with the `/admin_createUserWithBaa` endpoint.

The API calls are succeeding (HTTP 200, userId returned), but the doctor/practice is NOT receiving the signup email.

Questions:
1. Is email sending enabled for the /admin_createUserWithBaa endpoint in production?
2. Is there a test/dev mode that suppresses emails?
3. Do we need to configure anything on our end to trigger the emails?
4. Are there email templates set up for this new endpoint?
5. Can you check if emails are being queued/sent in your logs for userId: [INSERT USERID FROM SUBMISSION]?

Test details:
- Endpoint: POST https://w6mxt54h5f.execute-api.us-east-2.amazonaws.com/Prod/admin_createUserWithBaa
- Email used: [YOUR EMAIL]
- Response: success: true, userId: [USERID]
- Expected: Signup email + BAA email
- Actual: No emails received (checked spam)

Thanks!
Alex
```

---

## 🚀 v21 Deployment:

**What's Fixed**:
- ✅ Lead Source is now a dropdown
- ✅ Submissions tab explained (already working)

**Still Needs Investigation**:
- ❓ Email sending - requires CuraGenesis backend check

**Deploy v21** with the dropdown fix now, then follow up with CuraGenesis about emails.

---

## Summary:

1. **Submissions**: Works as designed - shows API call history
2. **Lead Source**: Fixed to dropdown in v21
3. **Email**: Not a CRM issue - CuraGenesis backend needs to send it

Check Submissions tab to confirm your practice was successfully sent to CuraGenesis!

