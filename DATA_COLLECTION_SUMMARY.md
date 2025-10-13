# CuraGenesis CRM - Data Collection Summary

**Date:** October 13, 2025  
**Database:** PostgreSQL (via Prisma)  
**API Target:** CuraGenesis Partner Onboarding API

---

## 📊 **ALL DATA WE COLLECT IN OUR CRM**

### **1. Practice/Facility Information**

| Field | Database Column | Required | Notes |
|-------|----------------|----------|-------|
| Practice Name | `practice_name` | ✅ YES | Facility name |
| Specialty | `specialty` | ❌ No | Medical specialty dropdown |
| State | `state` | ✅ YES | US state (2-letter code) |
| NPI (Organization) | `npi_org` | ❌ No | 10-digit NPI |
| EIN/TIN | `ein_tin` | ❌ No | Tax ID (formatted XX-XXXXXXX) |
| Phone | `phone_display`, `phone_e164` | ❌ No | Display + E164 format |
| Fax | `fax` | ❌ No | Fax number |
| Email | `email` | ❌ No | Practice email |
| Website | `website` | ❌ No | Practice website |
| EHR System | `ehr_system` | ❌ No | Electronic health records system |
| Address Line 1 | `address_line1` | ❌ No | Street address |
| Address Line 2 | `address_line2` | ❌ No | Suite/unit |
| City | `city` | ❌ No | City name |
| ZIP Code | `zip` | ❌ No | Postal code |
| **Primary Contact Name** | `primary_contact_name` | ✅ YES | **NEW FIELD** |
| **Primary Contact Position** | `primary_contact_position` | ✅ YES | **NEW FIELD** |

**Internal Fields (Not sent to CuraGenesis):**
- `id` - UUID primary key
- `status` - PENDING, ACTIVE, INACTIVE
- `lead_source` - Where lead came from
- `owner_rep_id` - Assigned sales rep
- `curagenesis_user_id` - ID from CuraGenesis API
- `total_orders` - Order count
- `last_synced_at` - Last sync timestamp
- `created_at`, `updated_at` - Audit timestamps

---

### **2. Contact Information (Multiple Contacts per Practice)**

| Field | Database Column | Required | Notes |
|-------|----------------|----------|-------|
| Full Name | `full_name` | ✅ YES | Contact's full name |
| Contact Type | `contact_type` | ✅ YES | PHYSICIAN, PRACTICE_MANAGER, NURSE, ADMIN, OTHER |
| Title/Position | `title` | ❌ No | Job title |
| NPI (Individual) | `npi_individual` | ❌ No | 10-digit individual NPI |
| Phone | `phone_display`, `phone_e164` | ❌ No | Display + E164 format |
| Email | `email` | ❌ No | Contact email |
| Preferred Contact Method | `preferred_contact_method` | ❌ No | Email, Phone, Text |
| Is Primary | `is_primary` | ❌ No | Boolean flag for primary contact |

**Internal Fields:**
- `id` - UUID
- `account_id` - Foreign key to accounts table
- `created_at`, `updated_at` - Timestamps

---

## 🚀 **WHAT WE SEND TO CURAGENESIS API**

### **Endpoint:** `POST /admin_createUserWithBaa`

### **Payload Structure:**

```typescript
{
  // PRIMARY CONTACT INFO (from first contact in contacts array)
  email: string;                    // PRIMARY CONTACT EMAIL ✅ REQUIRED
  firstName: string;                // Parsed from full_name
  lastName: string;                 // Parsed from full_name
  
  // DOCUMENT STATUS
  baaSigned: false;                 // Always false (not signed yet)
  paSigned: false;                  // Always false (not signed yet)
  
  // FACILITY BASIC INFO
  facilityName: string;             // practice_name ✅ REQUIRED
  facilityAddress: {
    line1: string;                  // address_line1 ✅ REQUIRED
    line2?: string;                 // address_line2 (optional)
    city: string;                   // city ✅ REQUIRED
    state: string;                  // state (2-letter) ✅ REQUIRED
    postalCode: string;             // zip ✅ REQUIRED
    country: "US";                  // Always "US"
    phone?: string;                 // phone_e164 (optional)
    fax?: string;                   // fax (optional)
  };
  
  // FACILITY IDs
  facilityNPI?: string;             // npi_org (optional)
  facilityTIN?: string;             // ein_tin (optional)
  facilityPTAN?: string;            // NOT COLLECTED (optional)
  facilityPhone?: string;           // phone_e164 (optional)
  facilityFax?: string;             // fax (optional)
  
  // PRIMARY CONTACT (NEW FIELDS)
  primaryContactName?: string;      // primary_contact_name ✅ NEW
  primaryContactEmail?: string;     // from contacts[0].email
  primaryContactPhone?: string;     // from contacts[0].phone_e164
  
  // SHIPPING (NOT COLLECTED YET)
  shippingContact?: string;         // NOT COLLECTED
  shippingAddresses?: Array<{       // NOT COLLECTED
    name: string;
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    instructions?: string;
  }>;
  
  // PHYSICIAN INFO (from contacts where contact_type = "PHYSICIAN")
  physicianInfo?: {
    name: string;                   // full_name of first PHYSICIAN contact
    email?: string;                 // email
    npi?: string;                   // npi_individual
  };
  
  // ADDITIONAL PHYSICIANS (other PHYSICIAN contacts)
  additionalPhysicians?: Array<{
    name: string;                   // full_name
    email?: string;                 // email
    npi?: string;                   // npi_individual
  }>;
}
```

---

## ✅ **WHAT'S WORKING**

1. ✅ **Practice/Facility Data** - All collected and mapped
2. ✅ **Primary Contact** - Collected (name + position fields added)
3. ✅ **Address** - Full address collected
4. ✅ **Physician Info** - Extracted from contacts array
5. ✅ **Multiple Contacts** - Support for multiple contacts per practice
6. ✅ **Phone Formatting** - E164 format for API submission
7. ✅ **Duplicate Detection** - Check NPI/Phone before submission

---

## ⚠️ **POTENTIAL ISSUES (Based on Ian's Message)**

### **Issue: Database Column Mismatch?**

Ian mentioned looking in "BAAData" DynamoDB table, but **we're using PostgreSQL**, not DynamoDB!

**Our Setup:**
- ✅ Database: PostgreSQL (RDS)
- ✅ ORM: Prisma
- ✅ Schema: `prisma/schema.prisma`
- ✅ Columns: `primary_contact_name` and `primary_contact_position` are **DEFINED** in schema

**To verify columns exist in actual database:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'accounts' 
AND column_name LIKE 'primary_contact%';
```

### **Possible Causes:**
1. Migration not run yet (columns defined but not created)
2. Different database environment (dev vs prod)
3. Confusion with Ian's separate DynamoDB system

---

## 🔧 **QUICK DIAGNOSTIC**

Run this to check if columns exist:

```bash
# Check if columns are in the database
psql $DATABASE_URL -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'accounts'
AND column_name IN ('primary_contact_name', 'primary_contact_position')
ORDER BY column_name;
"
```

**Expected Output:**
```
        column_name        | data_type | is_nullable
---------------------------+-----------+-------------
 primary_contact_name      | text      | YES
 primary_contact_position  | text      | YES
```

**If Empty Output:**
```bash
# Run the migration
npx prisma db push
```

---

## 📋 **FIELDS WE DON'T COLLECT (But API Supports)**

These are **optional** fields in the CuraGenesis API that we don't currently collect:

1. ❌ `selectedFacility` - Pre-existing facility ID
2. ❌ `facilityPTAN` - Medicare PTAN number
3. ❌ `shippingContact` - Separate shipping contact name
4. ❌ `shippingAddresses[]` - Separate shipping addresses (we use facility address)

**Do we need these?** Probably not for MVP. Can add later if needed.

---

## 🎯 **DATA FLOW DIAGRAM**

```
1. REP FILLS OUT FORM (account-form.tsx)
   ↓
   • Practice Name ✅
   • Primary Contact Name ✅ (NEW)
   • Primary Contact Position ✅ (NEW)
   • Address, Phone, Email, NPI, EIN/TIN
   ↓
2. REP ADDS CONTACTS (contacts-manager.tsx)
   ↓
   • Contact 1 (Primary)
   • Contact 2 (Physician)
   • Contact 3+ (Additional)
   ↓
3. CRM SAVES TO POSTGRESQL
   ↓
   • accounts table
   • contacts table
   ↓
4. REP CLICKS "SEND TO CURAGENESIS"
   ↓
5. CRM TRANSFORMS DATA (curagenesis-client.ts)
   ↓
   • IntakePayload → BaaPayload
   • primaryContactName from primary_contact_name column
   • Physician contacts extracted
   ↓
6. API CALL: POST /admin_createUserWithBaa
   ↓
7. CURAGENESIS PROCESSES
   ↓
   • Creates user account
   • Sends BAA documents for signing
   • Returns userId
   ↓
8. CRM UPDATES RECORD
   ↓
   • Save curagenesis_user_id
   • Status → ACTIVE
   • Create submission log
```

---

## 🚨 **ACTION ITEMS**

### **For You (Right Now):**

1. **Verify Database Columns:**
   ```bash
   psql $DATABASE_URL -c "\d accounts" | grep primary_contact
   ```

2. **If Columns Missing, Run Migration:**
   ```bash
   npx prisma db push
   ```

3. **Test Account Creation:**
   - Go to `/intake`
   - Create new account with all fields
   - Check if primary_contact_name and primary_contact_position save correctly

4. **Check API Payload:**
   - Look at console logs when submitting
   - Verify `primaryContactName` is in the payload

### **For Ian (If He's Confused):**

Ian might be looking at **HIS** DynamoDB setup (BAAData table), which is **separate** from your CRM's PostgreSQL database. Your CRM is **self-contained** and doesn't query his DynamoDB tables.

**Two Separate Systems:**
- **Ian's System:** DynamoDB (BAAData, Facilities tables)
- **Your CRM:** PostgreSQL (accounts, contacts tables)

Your CRM **sends data TO** Ian's API, but doesn't **query** his database directly.

---

## 📞 **Next Steps**

1. Run the diagnostic SQL above
2. If columns missing, run `npx prisma db push`
3. Test creating an account with primary contact fields
4. Share results so we can fix any remaining issues

**Need the exact SQL commands to run? Let me know!**

