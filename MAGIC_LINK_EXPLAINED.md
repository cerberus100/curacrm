# Magic Link - What It Is and Why We Need It

**Date:** October 17, 2025  
**Audience:** CuraGenesis Backend Team

---

## 🎯 WHAT IS A MAGIC LINK?

A **magic link** is a **passwordless authentication URL** sent to a user's email that allows them to:
- Verify their email address
- Complete account setup
- Access their account without creating a password first

**Example:**
```
https://portal.curagenesis.com/onboard?token=11l8yup99aoh71gmzldzshog0q29mjc41n
```

---

## 🔄 WHY WE NEED IT

### The Problem Without Magic Links
When a sales rep signs up a practice, the practice contact would need to:
1. Wait for the rep to tell them about CuraGenesis
2. Go to the website and click "Sign Up"
3. Fill out all their information again (duplicate work!)
4. Create a password
5. Verify email
6. Complete onboarding

**This is slow, creates friction, and many practices never complete it.**

### The Solution With Magic Links
When a sales rep signs up a practice through the CRM:
1. ✅ Rep pre-fills all practice information
2. ✅ Practice receives email immediately with magic link
3. ✅ Practice clicks link → goes directly to onboarding (already logged in!)
4. ✅ Practice reviews info, signs BAA, adds payment
5. ✅ Practice is active and can start ordering

**This is fast, seamless, and has much higher completion rates.**

---

## 🔐 HOW MAGIC LINKS WORK

### 1. Generate Secure Token
When CRM submits a practice, your Lambda generates a unique token:

```javascript
const token = crypto.randomBytes(32).toString('hex');
// Result: "11l8yup99aoh71gmzldzshog0q29mjc41n"
```

### 2. Store Token in Database
Link the token to the practice user:

```javascript
await db.magicLinks.create({
  token: "11l8yup99aoh71gmzldzshog0q29mjc41n",
  userId: "practice-user-123",
  expiresAt: Date.now() + (72 * 60 * 60 * 1000), // 72 hours
  used: false
});
```

### 3. Send Email with Magic Link
Email contains the link:

```
Click here to complete your CuraGenesis setup:
https://portal.curagenesis.com/onboard?token=11l8yup99aoh71gmzldzshog0q29mjc41n
```

### 4. Practice Clicks Link
When they click:
1. Browser goes to: `https://portal.curagenesis.com/onboard?token=11l8yup99aoh71gmzldzshog0q29mjc41n`
2. Your portal backend receives the token
3. Validates token exists and hasn't expired
4. Logs the user in automatically
5. Shows onboarding form with pre-filled data
6. Marks token as "used" so it can't be reused

---

## 📧 THE EMAIL SHOULD CONTAIN

### Subject
```
Complete Your CuraGenesis Account - [Practice Name]
```

### Body
```
Hi [Contact Name],

Welcome to CuraGenesis! Your sales representative [Rep Name] has set up an account for your practice.

PRACTICE INFORMATION:
- Name: [Practice Name]
- Specialty: [Specialty]
- Location: [City, State]
- Contact: [Primary Contact] - [Position]

COMPLETE YOUR SETUP:
Click the button below to review your information and complete your account setup:

[Button: Complete Setup]
(Link: https://portal.curagenesis.com/onboard?token=11l8yup99aoh71gmzldzshog0q29mjc41n)

This link will expire in 72 hours for security.

You'll be able to:
✓ Review and verify your practice details
✓ Sign the Business Associate Agreement (BAA)
✓ Set up your account credentials
✓ Add billing and payment information
✓ Start ordering products

QUESTIONS?
Contact your sales representative:
[Rep Name] - [Rep Email]

Or reach out to our support team:
support@curagenesis.com

Thanks,
The CuraGenesis Team

---
This email was sent to [Practice Email] because [Practice Name] was registered 
by [Rep Name] ([Rep Email]) on [Date].

If you didn't expect this email, you can safely ignore it.
```

---

## 🔒 SECURITY CONSIDERATIONS

### Token Requirements
- ✅ **Long and random** (at least 32 bytes)
- ✅ **Cryptographically secure** (use crypto.randomBytes, NOT Math.random)
- ✅ **One-time use** (mark as used after first click)
- ✅ **Time-limited** (expire after 72 hours)
- ✅ **URL-safe** (hex encoding is safe)

### What to Validate
When someone visits `/onboard?token=...`:

1. **Check token exists** in database
   ```javascript
   const link = await db.magicLinks.findOne({ token });
   if (!link) return error("Invalid link");
   ```

2. **Check not expired**
   ```javascript
   if (link.expiresAt < Date.now()) return error("Link expired");
   ```

3. **Check not already used**
   ```javascript
   if (link.used) return error("Link already used");
   ```

4. **Auto-login the user**
   ```javascript
   const session = await createSession(link.userId);
   setCookie('auth-token', session.token);
   ```

5. **Mark as used**
   ```javascript
   await db.magicLinks.update({ token }, { used: true });
   ```

6. **Show onboarding form**
   - Pre-fill practice data
   - Let them review and confirm
   - Sign BAA
   - Add payment info
   - Activate account

---

## 🎯 WHY THIS MATTERS FOR SALES

### Without Magic Links (Old Way)
- Sales rep pitches practice
- Practice says "I'll think about it"
- Rep sends follow-up email
- Practice goes to website, sees signup form
- **50% drop off** - they don't bother filling it out again
- Rep has to follow up multiple times
- Slow conversion

### With Magic Links (New Way)
- Sales rep pitches practice
- Rep fills out info in CRM while on call
- Practice receives email **immediately**
- Practice clicks link, sees **their info already filled in**
- Practice just reviews, signs, and adds payment
- **90% completion rate** - much higher conversion
- Faster time to first order
- Happy sales reps (they get credit immediately)

---

## 📊 EXPECTED FLOW

### Step 1: Sales Rep in CRM
```
Rep fills out:
- Practice: "Sunshine Medical"
- Contact: "Dr. Sarah Johnson" <sarah@sunshinemedical.com>
- Specialty: Family Medicine
- Location: Austin, TX
- NPI, TIN, address, phone, etc.

Rep clicks: "Send to Practice"
```

### Step 2: Your Lambda Receives
```json
{
  "practice": {
    "name": "Sunshine Medical",
    "email": "sarah@sunshinemedical.com",
    ...
  },
  "rep": {
    "name": "Alex Siegel",
    "email": "asiegel@curagenesis.com"
  }
}
```

### Step 3: Your Lambda Does
```javascript
1. Create practice user in database
2. Generate magic link token
3. Store token with userId and expiry
4. Send email to sarah@sunshinemedical.com with magic link
5. Return success with practiceId, magicLink, etc.
```

### Step 4: Practice Contact Receives Email
```
From: noreply@curagenesis.com
To: sarah@sunshinemedical.com
Subject: Complete Your CuraGenesis Account - Sunshine Medical

[Email with magic link button]
```

### Step 5: Practice Clicks Link
```
Browser opens: https://portal.curagenesis.com/onboard?token=abc123...
Your portal backend:
1. Validates token
2. Auto-logs them in
3. Shows onboarding form with pre-filled data
4. They review, sign BAA, add payment
5. Account activated!
```

### Step 6: Practice is Active
- Can log in to portal
- Can browse products
- Can place orders
- Rep gets credit for the sale

---

## ⚠️ CURRENT ISSUE

Your Lambda returns `"magicLinkSent": false` which means:
- ✅ You're generating the token
- ✅ You're creating the practice
- ❌ **You're NOT actually sending the email**

**Why?**
Probably one of:
1. SES is not verified for sender email (`noreply@curagenesis.com`)
2. SES region is wrong
3. Email sending code isn't actually being executed
4. Email is failing silently

**Fix:**
1. Verify sender email in SES:
   ```bash
   aws ses verify-email-identity --email-address noreply@curagenesis.com --region us-east-2
   ```
2. Check verification:
   ```bash
   aws ses list-verified-email-addresses --region us-east-2
   ```
3. Update Lambda to set `magicLinkSent: true` ONLY after email actually sends
4. Test by actually checking the practice email inbox

---

## ✅ CHECKLIST FOR BACKEND TEAM

- [x] Lambda function updated and deployed
- [x] Magic link token generation working
- [x] Practice user creation working
- [x] Rep attribution tracking working
- [ ] **SES sender email verified** ← YOU NEED TO DO THIS
- [ ] **Email actually being sent** ← YOU NEED TO DO THIS
- [ ] **Practice receives email** ← YOU NEED TO VERIFY THIS
- [ ] **Magic link works when clicked** ← YOU NEED TO TEST THIS
- [ ] Portal onboarding flow working
- [ ] Token validation working
- [ ] Auto-login after magic link click working

---

## 🎉 BOTTOM LINE

**Magic links are the SECRET SAUCE that makes this CRM valuable.**

Without them, it's just a glorified contact form.

With them, we go from **rep pitch → practice onboarded** in minutes instead of days.

**That's why we need the email to actually send.** 🚀

---

## 📞 NEXT STEP

**Backend Team:** 
1. Verify `noreply@curagenesis.com` in SES (us-east-2)
2. Test the email actually sends
3. Check practice inbox to confirm receipt
4. Share screenshot of received email

Once email works, the entire flow is complete!

