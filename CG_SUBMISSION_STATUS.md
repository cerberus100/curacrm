# CuraGenesis Practice Submission - Current Status

**Date:** October 16, 2025, 3:02 PM  
**Status:** 🔴 BLOCKED - External API Lambda has JSON parsing error

---

## ✅ WHAT'S WORKING

### CRM Configuration (All Correct)
- ✅ Base URL set: `https://ix0n88n8ze.execute-api.us-east-2.amazonaws.com/prod`
- ✅ API Key configured: `DDi4...1en`
- ✅ Vendor Token configured: `Nb9s...9pDt`
- ✅ Timeout: 60000ms
- ✅ Headers: `x-vendor-token`, `x-api-key`, `x-vendor-key`
- ✅ Rate limiting: Lenient (1000 req/15min)
- ✅ WorkMail URL: `https://curagenesis.awsapps.com/mail`
- ✅ Payload transformation: Correct BaaPayload format
- ✅ Stage fallbacks: `/Prod`, `/prod`, `""` (no prefix)
- ✅ Endpoint fallbacks: `/admin_createUserWithBaa`, `/admin/createUserWithBaa`, `/admin_createUserWithBAA`, `/api/createUser`

### Infrastructure
- ✅ Docker image built and pushed to ECR
- ✅ ECS task definition updated (revision 52+)
- ✅ Service deployed and stable
- ✅ Health check: OK
- ✅ All env vars present in ECS task

---

## 🔴 WHAT'S BROKEN

### External Lambda API Issue
**Endpoint:** `POST https://ix0n88n8ze.execute-api.us-east-2.amazonaws.com/prod/admin_createUserWithBaa`

**Problem:** Lambda returns 500 error with message:
```json
{
  "error": "Invalid JSON in request body",
  "details": "Unexpected token e in JSON at position 0",
  "receivedBody": "email:testuser@example.com"
}
```

**Root Cause:**
- API Gateway is NOT passing the request body correctly to Lambda
- Lambda is receiving `email:testuser@example.com` instead of the full JSON payload
- This suggests API Gateway integration mapping is incorrect

**What We Send (Correct):**
```http
POST /prod/admin_createUserWithBaa HTTP/1.1
Host: ix0n88n8ze.execute-api.us-east-2.amazonaws.com
Content-Type: application/json
x-vendor-token: Nb9s...
x-api-key: DDi4...
Idempotency-Key: <uuid>

{
  "email": "asiegel@curagenesis.com",
  "firstName": "Jon",
  "lastName": "Hopkins",
  "baaSigned": false,
  "paSigned": false,
  "facilityName": "wound masters",
  "facilityAddress": {
    "line1": "114 victor ln",
    "line2": "suite 237",
    "city": "Bonsall",
    "state": "AZ",
    "postalCode": "44433",
    "country": "US",
    "phone": "+19876785544"
  },
  "facilityNPI": "9988553321",
  "facilityTIN": "324568789",
  "facilityPhone": "+19876785544",
  "primaryContactName": "jon hopkins",
  "primaryContactEmail": "asiegel@curagenesis.com"
}
```

**What Lambda Receives (Broken):**
```
email:testuser@example.com
```

---

## 🔧 HOW TO FIX (Backend Team)

### Option 1: Enable Lambda Proxy Integration (RECOMMENDED)
1. Go to API Gateway console
2. Find API ID: `ix0n88n8ze`
3. Navigate to `/admin_createUserWithBaa` POST method
4. Click "Integration Request"
5. Verify "Use Lambda Proxy integration" is **checked**
6. If not checked, enable it and redeploy the API
7. Test: `curl -X POST <endpoint> -H "Content-Type: application/json" -d '{"email":"test@example.com",...}'`

### Option 2: Fix Integration Mapping Template
If proxy integration can't be enabled, update the mapping template to forward `$input.body`:
```vtl
#set($inputRoot = $input.path('$'))
{
  "body": $input.json('$'),
  "headers": {
    #foreach($header in $input.params().header.keySet())
    "$header": "$util.escapeJavaScript($input.params().header.get($header))"#if($foreach.hasNext),#end
    #end
  }
}
```

### Option 3: Use Different API
If there's a working alternative endpoint for practice submission, provide:
- Full URL
- Required headers
- Payload format
We'll switch immediately.

---

## 📊 TESTING EVIDENCE

### Direct API Test (Fails)
```bash
curl -X POST https://ix0n88n8ze.execute-api.us-east-2.amazonaws.com/prod/admin_createUserWithBaa \
  -H "Content-Type: application/json" \
  -H "x-vendor-token: Nb9sQCZnrAxAxS4KrysMLzRUQ2HN21hbZmpshgZYb1cT7sEPdJkNEE_MhfB59pDt" \
  -H "x-api-key: DDi4EEcXyx1q6UcQc4ezX6mlhaoNo7Lo9q7SO1en" \
  -d '{"email":"test@example.com","firstName":"Test","lastName":"User","baaSigned":false,"paSigned":false,"facilityName":"Test"}'

# Response: 500 - "Unexpected token e in JSON at position 0"
```

### CRM Submission Logs
- Activity logged: `[Activity] PRACTICE_SUBMITTED by e8c6d7b0... - wound masters`
- Submission status: `FAILED`
- HTTP Code: `403` (from earlier attempts) or `500` (from new endpoint)
- Error: `Missing Authentication Token` (old) or JSON parse error (new)

---

## ⏱️ TIMELINE TO FIX

**Backend team action required:**
- Enable Lambda Proxy Integration: **5 minutes**
- OR provide working alternative endpoint: **Immediate**

**Once fixed, our CRM will:**
- Immediately start working (no CRM code changes needed)
- Successfully submit practices
- Create WorkMail accounts
- Send welcome emails

---

## 📞 CONTACT

**CRM Team:** Alex Siegel (asiegel@curagenesis.com)  
**Backend Team:** Please fix the Lambda/API Gateway integration ASAP  
**Priority:** 🔴 CRITICAL - Blocking all practice submissions

---

## 🎯 VERIFICATION STEPS (After Fix)

1. Backend team fixes Lambda integration
2. Test endpoint manually:
   ```bash
   curl -X POST https://ix0n88n8ze.execute-api.us-east-2.amazonaws.com/prod/admin_createUserWithBaa \
     -H "Content-Type: application/json" \
     -H "x-vendor-token: <token>" \
     -H "x-api-key: <key>" \
     -d '{"email":"test@example.com","firstName":"Test","lastName":"User","baaSigned":false,"paSigned":false,"facilityName":"Test Facility","facilityAddress":{"line1":"123 Main","city":"Austin","state":"TX","postalCode":"78701","country":"US"}}'
   ```
3. Should return: `{"success": true, "userId": "<uuid>"}`
4. Alex submits a test practice through CRM
5. Verify success message and WorkMail account creation

---

**STATUS: WAITING FOR BACKEND TEAM TO FIX LAMBDA JSON PARSING** 🔴

