# CuraGenesis API Migration Summary

**Date:** October 13, 2025  
**Version:** v15  
**Migration:** Old AWS Account → New AWS Account

---

## ✅ COMPLETED CHANGES

### 1. API Endpoint Updates

#### Partner API (Practice/Order Fetching)
- **Old:** `https://sr9bkv1k3k.execute-api.us-east-1.amazonaws.com/Admin-Prod`
- **New:** `https://w6mxt54h5f.execute-api.us-east-2.amazonaws.com/Prod`
- **Files Updated:**
  - `src/lib/curagenesis-api.ts` (CuraGenesisUserAPI class)
  - `src/lib/curagenesis-financials-api.ts` (Financials API)
  - `src/app/api/health/detailed/route.ts` (Health checks)

#### Practice Onboarding API (Practice Submission)
- **Old:** `POST /v1/practices/intake` (doesn't exist on new account)
- **New:** `POST /admin_createUserWithBaa`
- **Base URL:** `https://w6mxt54h5f.execute-api.us-east-2.amazonaws.com/Prod`
- **Authentication:** Changed from `Authorization: Bearer` to `x-vendor-token` header
- **Files Updated:**
  - `src/lib/curagenesis-client.ts` (Complete rewrite)

### 2. Authentication Changes

| API Type | Old Auth | New Auth |
|----------|----------|----------|
| Partner API (GET data) | `x-vendor-key` header | `x-vendor-key` header ✅ (same) |
| Practice Submission | `Authorization: Bearer` | `x-vendor-token` header |

### 3. Payload Transformation

The new `/admin_createUserWithBaa` endpoint requires a different payload structure:

#### Old Format (Internal):
```json
{
  "source_system": "intake_crm",
  "practice": { "name": "...", "address": {...} },
  "contacts": [...]
}
```

#### New Format (CuraGenesis API):
```json
{
  "email": "provider@clinic.com",
  "firstName": "John",
  "lastName": "Smith",
  "baaSigned": false,
  "paSigned": false,
  "facilityName": "Example Clinic",
  "facilityAddress": {
    "line1": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "postalCode": "78701",
    "country": "US"
  },
  "physicianInfo": {...},
  "additionalPhysicians": [...]
}
```

**Solution:** Added `transformPayload()` method in `CuraGenesisClient` to automatically convert between formats.

---

## ⚠️ PENDING TASKS

### 1. Database Schema Update (CRITICAL)
**Issue:** Missing columns in `accounts` table causing KPI endpoint failures.

**Required SQL:**
```sql
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS primary_contact_name TEXT,
ADD COLUMN IF NOT EXISTS primary_contact_position TEXT;
```

**How to Fix:**
1. Go to AWS Console → RDS → Query Editor
2. Connect to `cura-genesis-crm-db` database
3. Run the SQL above
4. Refresh the dashboard

**Impact:** Dashboard KPI metrics will show errors until this is run.

### 2. Test Practice Submission
Once v15 is deployed, test submitting a practice to verify the new API integration works:
1. Create a new account in Intake
2. Click "Send to CuraGenesis"
3. Verify success response with `userId`
4. Check that the user receives an invite email from CuraGenesis

---

## 📊 DEPLOYMENT STATUS

| Version | Date | Status | Changes |
|---------|------|--------|---------|
| v12 | Oct 13 | ✅ Live | Initial API endpoint update (Partner API) |
| v13 | Oct 13 | ✅ Live | Added migration script (failed - permissions) |
| v14 | Oct 13 | ✅ Live | Updated startup script for migrations |
| v15 | Oct 13 | 🚀 Ready | Practice submission API updated |

---

## 🧪 TESTING CHECKLIST

### Partner API (Fetching Data)
- ✅ Fetch practices: `POST /api/partner/v1/practices`
- ✅ Fetch orders: `POST /api/partner/v1/orders`  
- ✅ Fetch financials: `GET /api/partner/v1/financials`
- ✅ Health check endpoint

### Practice Submission API
- ⏳ Submit new practice: `POST /admin_createUserWithBaa`
- ⏳ Verify user creation and invite email
- ⏳ Test with various contact types (physician, admin, etc.)
- ⏳ Test retry logic on failures

### Dashboard
- ⏳ KPI Overview loads without errors (requires DB fix)
- ⏳ Practice sync works
- ⏳ Leaderboard displays correctly
- ⏳ Geographic data shows

---

## 📝 ENVIRONMENT VARIABLES

All environment variables remain the same:
- `CURAGENESIS_VENDOR_TOKEN` - Used for both Partner API and Practice Submission
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - For CRM auth
- `NEXT_PUBLIC_API_URL` - Public API URL

---

## 🔗 API DOCUMENTATION REFERENCES

1. **Partner API Endpoints:** See complete endpoint list in chat
2. **Practice Onboarding API:** `/Users/alexsiegel/Library/.../CuraGenesis-Partner-Onboarding-API.md`
3. **Financials API:** `/Users/alexsiegel/Library/.../CuraGenesis_Partner_Financials_API.md`

---

## 📞 SUPPORT

For API issues or questions:
- **Contact:** Alex Siegel (asiegel@curagenesis.com)
- **Region:** us-east-2 (Ohio)
- **API Gateway ID:** w6mxt54h5f

---

## 🎯 NEXT STEPS

1. **Deploy v15** (practice submission API update)
2. **Run database migration** (add primary_contact columns)
3. **Test end-to-end flow** (create → submit → verify)
4. **Monitor CloudWatch logs** for any errors
5. **Update documentation** once confirmed working

