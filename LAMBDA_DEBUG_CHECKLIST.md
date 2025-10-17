# Lambda Email Sending - Debug Checklist

**Date:** October 17, 2025, 9:26 PM  
**Status:** magicLinkSent still returning false despite SES permissions

---

## 🔍 CURRENT SITUATION

### What's Working
- ✅ Lambda receives practice submissions (HTTP 200)
- ✅ Practice user created (`practiceId: PRACTICE-1760675189644`)
- ✅ Magic link token generated
- ✅ SES permissions added (AmazonSESFullAccess)
- ✅ Domain verified (curagenesis.com)
- ✅ No WorkMail errors

### What's NOT Working
- ❌ `magicLinkSent: false` (should be true)
- ❌ No email arriving at practice inbox
- ❌ SES sendEmail() not being called or failing silently

---

## 🔧 DEBUGGING STEPS FOR BACKEND TEAM

### Step 1: Check Lambda Execution Logs

**View recent invocations:**
```bash
aws logs tail /aws/lambda/admin_createUserWithBaa --since 10m --region us-east-2 --follow
```

**Look for:**
- SES sendEmail calls
- Any errors or exceptions
- Email sending success/failure messages
- Stack traces

### Step 2: Check Your Lambda Code

**Search for these issues:**

```javascript
// ❌ BAD - Email code commented out
// const emailResult = await ses.sendEmail(...);

// ❌ BAD - Email code in try-catch but errors swallowed
try {
  await ses.sendEmail(...);
} catch (e) {
  // Silently ignoring error
}

// ❌ BAD - Returning success before email sends
return { success: true, magicLinkSent: true }; // Don't do this before email!

// ✅ GOOD - Proper email sending with error handling
let emailSent = false;
try {
  await ses.sendEmail({
    Source: 'noreply@curagenesis.com',
    Destination: { ToAddresses: [practiceEmail] },
    Message: {
      Subject: { Data: 'Complete Your CuraGenesis Account' },
      Body: { Html: { Data: emailHtml } }
    }
  });
  emailSent = true;
  console.log('✅ Email sent to:', practiceEmail);
} catch (error) {
  console.error('❌ SES send failed:', error);
  emailSent = false;
}

return {
  success: true,
  data: {
    magicLinkSent: emailSent,  // Only true if email actually sent
    ...
  }
};
```

### Step 3: Verify SES Configuration in Lambda

**Check environment variables:**
```javascript
console.log('SES Region:', process.env.AWS_REGION);
console.log('Portal URL:', process.env.PORTAL_URL);
```

**Check SES client initialization:**
```javascript
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const ses = new SESClient({ region: 'us-east-2' }); // Must match where domain is verified

console.log('SES Client initialized for region:', 'us-east-2');
```

### Step 4: Test SES Directly in Lambda

**Add this test code temporarily:**
```javascript
// Test SES is working
try {
  const testResult = await ses.send(new SendEmailCommand({
    Source: 'noreply@curagenesis.com',
    Destination: { ToAddresses: ['YOUR_TEST_EMAIL@example.com'] },
    Message: {
      Subject: { Data: 'SES Test from Lambda' },
      Body: { Html: { Data: '<h1>Test Email</h1><p>If you see this, SES is working!</p>' } }
    }
  }));
  console.log('✅ SES Test Success:', testResult);
} catch (error) {
  console.error('❌ SES Test Failed:', error);
}
```

### Step 5: Check Common Issues

**❌ Wrong region:**
```javascript
// BAD - Domain verified in us-east-2, but SES client in us-east-1
const ses = new SESClient({ region: 'us-east-1' }); // Wrong!

// GOOD
const ses = new SESClient({ region: 'us-east-2' }); // Correct!
```

**❌ Unverified sender:**
```javascript
// BAD - Email not verified
Source: 'no-reply@curagenesis.com' // Typo or not verified

// GOOD  
Source: 'noreply@curagenesis.com' // Must match verified identity
```

**❌ Missing await:**
```javascript
// BAD - Not waiting for email to send
ses.sendEmail(...); // Forgot await!
return { success: true };

// GOOD
await ses.sendEmail(...); // Wait for it!
return { success: true };
```

**❌ Not importing SES SDK:**
```javascript
// BAD - SDK not imported
const ses = new SESClient(); // ReferenceError!

// GOOD
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const ses = new SESClient({ region: 'us-east-2' });
```

---

## 📊 WHAT YOU SHOULD SEE IN LOGS

### Successful Email Send
```
2025-10-17T04:30:00.000Z START RequestId: abc123...
2025-10-17T04:30:00.100Z Received practice submission for: Practice Name
2025-10-17T04:30:00.200Z Generated magic link: https://portal.curagenesis.com/onboard?token=...
2025-10-17T04:30:00.300Z Sending email to: practice@example.com
2025-10-17T04:30:00.800Z ✅ Email sent successfully
2025-10-17T04:30:00.900Z MessageId: 01234567-89ab-cdef-0123-456789abcdef
2025-10-17T04:30:01.000Z END RequestId: abc123...
```

### Failed Email Send (What to Look For)
```
2025-10-17T04:30:00.800Z ❌ SES send failed: MessageRejected: Email address is not verified
2025-10-17T04:30:00.800Z ❌ SES send failed: InvalidParameterValue: Missing region
2025-10-17T04:30:00.800Z ❌ SES send failed: AccessDenied: User not authorized
```

---

## 🧪 TESTING CHECKLIST

### Test 1: Direct SES Test
**Run this AWS CLI command to verify SES works:**
```bash
aws ses send-email \
  --from noreply@curagenesis.com \
  --destination ToAddresses=YOUR_EMAIL@example.com \
  --message Subject={Data="SES Test"},Body={Html={Data="<h1>Test</h1>"}} \
  --region us-east-2
```

**Expected:** Email arrives at YOUR_EMAIL@example.com within 1 minute.

### Test 2: Lambda Function Test
**Invoke Lambda directly:**
```bash
aws lambda invoke \
  --function-name admin_createUserWithBaa \
  --region us-east-2 \
  --payload file://test-payload.json \
  response.json

cat response.json
```

**Expected:** response.json shows `magicLinkSent: true`

### Test 3: Via CRM
**Submit practice through CRM:**
- Practice name: Test Practice
- Email: YOUR_EMAIL@example.com
- Fill all required fields
- Click "Send to Practice"

**Expected:**
1. CRM shows success
2. Response has `magicLinkSent: true`
3. Email arrives within 1-2 minutes
4. Email contains magic link button

---

## 🎯 EXACT ISSUE TO FIND

**The Lambda is:**
- ✅ Receiving the request
- ✅ Creating the practice
- ✅ Generating the magic link
- ✅ Building the response
- ❌ **NOT CALLING ses.sendEmail() or it's failing**

**Look for one of these in your code:**

1. **Email code commented out**
   ```javascript
   // await sendMagicLinkEmail(practiceEmail, magicLink);
   ```

2. **Error swallowed silently**
   ```javascript
   try {
     await ses.sendEmail(...);
   } catch (e) {
     // No logging - error hidden!
   }
   ```

3. **Conditional that prevents sending**
   ```javascript
   if (process.env.NODE_ENV === 'production') {
     await ses.sendEmail(...);
   }
   // If ENV not set, email never sends!
   ```

4. **Code after return statement**
   ```javascript
   return { success: true, ... };
   await ses.sendEmail(...); // Never executes!
   ```

5. **Missing await**
   ```javascript
   ses.sendEmail(...); // Forgot await - doesn't wait for it!
   return { success: true };
   ```

---

## 📋 WHAT TO DO NOW

### Immediate Actions

1. **Add detailed logging:**
   ```javascript
   console.log('[EMAIL] Starting email send to:', practiceEmail);
   console.log('[EMAIL] SES region:', ses.config.region);
   console.log('[EMAIL] From address:', 'noreply@curagenesis.com');
   
   try {
     const result = await ses.send(new SendEmailCommand({...}));
     console.log('[EMAIL] ✅ Success! MessageId:', result.MessageId);
     magicLinkSent = true;
   } catch (error) {
     console.error('[EMAIL] ❌ Failed:', error.message);
     console.error('[EMAIL] Error details:', JSON.stringify(error));
     magicLinkSent = false;
   }
   ```

2. **Check CloudWatch logs** immediately after test
3. **Share the logs** with CRM team
4. **Fix the issue** based on what logs show

### Long-term Fix

Once email works:
- ✅ Keep the logging (helpful for debugging)
- ✅ Set up CloudWatch alerts for email failures
- ✅ Monitor bounce and complaint rates
- ✅ Add retry logic for transient failures

---

## 🚨 CRITICAL

**magicLinkSent MUST be true when email actually sends.**

**Don't return true if email failed!** This will cause:
- CRM thinks practice was notified (they weren't)
- Practice never receives magic link
- Practice can't onboard
- Rep doesn't get credit
- Customer lost

**Only set magicLinkSent: true AFTER successful send!**

---

## 📞 EXPECTED TIMELINE

- **Right now:** Backend checks CloudWatch logs
- **Within 5 minutes:** Backend finds and fixes issue
- **Within 10 minutes:** Backend deploys fix
- **Within 15 minutes:** Test confirms email arrives

**We're so close!** The permissions are there, SES is verified, just need to find why the send isn't executing.

---

## ✅ SUCCESS CRITERIA

When this is working correctly:

1. ✅ CRM submits practice
2. ✅ Lambda creates practice user
3. ✅ Lambda generates magic link
4. ✅ Lambda calls SES sendEmail()
5. ✅ SES sends email successfully
6. ✅ Lambda returns `magicLinkSent: true`
7. ✅ Practice receives email within 1 minute
8. ✅ Email contains working magic link
9. ✅ Practice clicks link and can onboard

**Current progress: 6 out of 9 complete.** Just need the email send to execute!

---

**Backend team: Check your Lambda logs NOW and find why the sendEmail() call isn't happening or failing.**

