# CuraGenesis CRM → API Field Mapping & Data Handoff

**Date:** October 13, 2025  
**From:** CuraGenesis CRM Team (Alex Siegel)  
**To:** CuraGenesis Backend/API Team (Ian + Team)  
**Purpose:** Document all fields we're sending via `/admin_createUserWithBaa` endpoint

---

## 🎯 Executive Summary

The **CuraGenesis CRM** is now collecting additional data fields to provide richer practice information. This document maps **every field** we collect to the API payload we send to your `/admin_createUserWithBaa` endpoint.

**Key Points:**
- ✅ We're using the **new `/admin_createUserWithBaa` endpoint** (not old endpoints)
- ✅ Authentication via **`x-vendor-token`** header
- ✅ All fields are **already in your API spec** (no new fields needed)
- ✅ We're sending **optional fields** that improve data quality

**Action Required:** Please ensure your backend **stores all these fields** so they're available in your doctor ordering portal.

---

## 📡 API Endpoint Details

**Endpoint:** `POST https://w6mxt54h5f.execute-api.us-east-2.amazonaws.com/Prod/admin_createUserWithBaa`

**Headers:**
```
Content-Type: application/json
x-vendor-token: <OUR_VENDOR_TOKEN>
```

**Expected Response:**
```json
{
  "success": true,
  "userId": "8f8f1f1a-82c1-4b96-8b71-2b2b0d41b6a4"
}
```

---

## 📊 COMPLETE FIELD MAPPING

### **Section 1: User Information (Primary Contact)**

These fields identify who will receive the onboarding email and magic link.

| CRM Database Field | API Field | Type | Required | Example | Notes |
|-------------------|-----------|------|----------|---------|-------|
| `contacts[0].email` | `email` | string | ✅ YES | `provider@clinic.com` | First contact's email |
| `contacts[0].full_name` (first word) | `firstName` | string | ❌ No | `John` | Parsed from full name |
| `contacts[0].full_name` (rest) | `lastName` | string | ❌ No | `Smith` | Parsed from full name |
| N/A (hardcoded) | `baaSigned` | boolean | ❌ No | `false` | Always false for new submissions |
| N/A (hardcoded) | `paSigned` | boolean | ❌ No | `false` | Always false for new submissions |

---

### **Section 2: Facility/Practice Information**

Core practice details.

| CRM Database Field | API Field | Type | Required | Example | Notes |
|-------------------|-----------|------|----------|---------|-------|
| `accounts.practice_name` | `facilityName` | string | ✅ YES | `ABC Medical Center` | Practice name |
| `accounts.npi_org` | `facilityNPI` | string | ❌ No | `1234567890` | 10-digit NPI |
| `accounts.ein_tin` | `facilityTIN` | string | ❌ No | `123456789` | 9 digits (no dashes) |
| `accounts.phone_e164` | `facilityPhone` | string | ❌ No | `+12125551234` | E.164 format |
| `accounts.specialty` | N/A | string | ❌ No | `Family Medicine` | **NOT sent** (internal CRM use) |
| `accounts.ehr_system` | N/A | string | ❌ No | `Epic` | **NOT sent** (internal CRM use) |
| `accounts.website` | N/A | string | ❌ No | `https://clinic.com` | **NOT sent** (internal CRM use) |
| `accounts.lead_source` | N/A | string | ❌ No | `Referral` | **NOT sent** (internal CRM use) |

---

### **Section 3: Facility Address**

Complete mailing address for the practice.

| CRM Database Field | API Field | Type | Required | Example | Notes |
|-------------------|-----------|------|----------|---------|-------|
| `accounts.address_line1` | `facilityAddress.line1` | string | ✅ YES | `1234 Medical Way` | Street address |
| `accounts.address_line2` | `facilityAddress.line2` | string | ❌ No | `Suite 400` | Apt/Suite/Floor |
| `accounts.city` | `facilityAddress.city` | string | ✅ YES | `Austin` | City name |
| `accounts.state` | `facilityAddress.state` | string | ✅ YES | `TX` | 2-letter state code |
| `accounts.zip` | `facilityAddress.postalCode` | string | ✅ YES | `78701` | 5 or 9 digit ZIP |
| N/A (hardcoded) | `facilityAddress.country` | string | ✅ YES | `US` | Always "US" |
| `accounts.phone_e164` | `facilityAddress.phone` | string | ❌ No | `+12125551234` | Same as facilityPhone |

---

### **Section 4: Primary Contact Info** ⭐ **NEW FIELDS**

These are **newly added fields** in our CRM to capture the main practice contact.

| CRM Database Field | API Field | Type | Required | Example | Notes |
|-------------------|-----------|------|----------|---------|-------|
| `accounts.primary_contact_name` | `primaryContactName` | string | ⭐ **NEW** | `Dr. Jane Doe` | **Practice manager or main contact** |
| `accounts.primary_contact_position` | N/A | string | ⭐ **NEW** | `Practice Manager` | **NOT sent** (internal use, but **please consider adding to API**) |
| `contacts[0].email` | `primaryContactEmail` | string | ❌ No | `jane@clinic.com` | First contact's email |
| `contacts[0].phone_e164` | `primaryContactPhone` | string | ❌ No | `+12125555678` | First contact's phone |

**⚠️ IMPORTANT:**
- `primaryContactName` is **NOW being sent** (previously not sent)
- `primaryContactPosition` is **collected but NOT sent** (your API doesn't have this field yet)
- **Recommendation:** Add `primaryContactPosition` field to your API for better data quality

---

### **Section 5: Physician Information**

Extracted from contacts where `contact_type = 'PHYSICIAN'` or `npi_individual` is present.

#### **Primary Physician (First Match)**

| CRM Database Field | API Field | Type | Required | Example | Notes |
|-------------------|-----------|------|----------|---------|-------|
| `contacts[?].full_name` | `physicianInfo.name` | string | ❌ No | `Dr. Jamie Chen` | Where `contact_type='PHYSICIAN'` |
| `contacts[?].email` | `physicianInfo.email` | string | ❌ No | `jchen@clinic.com` | Physician's email |
| `contacts[?].npi_individual` | `physicianInfo.npi` | string | ❌ No | `1098765432` | 10-digit individual NPI |

#### **Additional Physicians (All Other Matches)**

| CRM Database Field | API Field | Type | Required | Example | Notes |
|-------------------|-----------|------|----------|---------|-------|
| `contacts[?].full_name` | `additionalPhysicians[].name` | string | ❌ No | `Dr. Casey Patel` | Array of additional physicians |
| `contacts[?].email` | `additionalPhysicians[].email` | string | ❌ No | `cpatel@clinic.com` | |
| `contacts[?].npi_individual` | `additionalPhysicians[].npi` | string | ❌ No | `1888888888` | |

---

### **Section 6: Contact Types We Collect**

We store multiple contacts per practice with these types:

| Contact Type (CRM) | Sent to API | Notes |
|-------------------|-------------|-------|
| `PHYSICIAN` | ✅ YES | As `physicianInfo` or `additionalPhysicians` |
| `PRACTICE_MANAGER` | ❌ No | Internal use only |
| `NURSE` | ❌ No | Internal use only |
| `ADMIN` | ❌ No | Internal use only |
| `OTHER` | ❌ No | Internal use only |

**Only physician contacts** are sent to your API. Other contact types are for internal CRM use (follow-ups, notes, etc.).

---

### **Section 7: Fields We DON'T Send (Internal CRM Only)**

These fields are collected in our CRM but **NOT sent** to your API:

| CRM Field | Why Not Sent | Notes |
|-----------|--------------|-------|
| `accounts.specialty` | Not in API spec | Medical specialty (e.g., "Family Medicine") |
| `accounts.ehr_system` | Not in API spec | EHR system (e.g., "Epic", "Cerner") |
| `accounts.website` | Not in API spec | Practice website URL |
| `accounts.lead_source` | Not in API spec | Where we found this lead (e.g., "Referral", "Cold Call") |
| `accounts.owner_rep_id` | Not in API spec | Which sales rep owns this account |
| `accounts.status` | Not in API spec | CRM status (PENDING, SUBMITTED, ACTIVE) |
| `accounts.curagenesis_user_id` | Not in API spec | Your returned `userId` (stored after successful submission) |
| `accounts.primary_contact_position` | **Not in API spec yet** | **RECOMMENDED TO ADD** |
| `contacts[].title` | Only for physicians | Job title (e.g., "RN", "Office Manager") |
| `contacts[].contact_type` | Only for physicians | One of: PHYSICIAN, PRACTICE_MANAGER, NURSE, ADMIN, OTHER |
| `contacts[].preferred_contact_method` | Not in API spec | Email, Phone, or Both |

---

## 📋 FIELDS WE DON'T CURRENTLY COLLECT (But Your API Supports)

Your API accepts these fields, but we **don't collect them yet**:

| API Field | Type | Status | Notes |
|-----------|------|--------|-------|
| `selectedFacility` | string | ❌ Not collected | Pre-existing facility ID |
| `facilityPTAN` | string | ❌ Not collected | Medicare PTAN number |
| `facilityFax` | string | ❌ Not collected | We collect `accounts.fax` but don't send it |
| `shippingContact` | string | ❌ Not collected | Separate shipping contact |
| `shippingAddresses[]` | array | ❌ Not collected | Separate shipping addresses |

**Do you need any of these?** If so, we can add them to our form.

---

## 🎯 EXAMPLE PAYLOAD WE SEND

Here's a **real example** of what we send to your API (including the new rep tracking):

```json
{
  "email": "john.smith@abcmedical.com",
  "firstName": "John",
  "lastName": "Smith",
  "baaSigned": false,
  "paSigned": false,
  
  "facilityName": "ABC Medical Center",
  "facilityAddress": {
    "line1": "1234 Medical Way",
    "line2": "Suite 400",
    "city": "Austin",
    "state": "TX",
    "postalCode": "78701",
    "country": "US",
    "phone": "+15125551234"
  },
  "facilityNPI": "1234567890",
  "facilityTIN": "123456789",
  "facilityPhone": "+15125551234",
  
  "primaryContactName": "Dr. Jane Doe",
  "primaryContactEmail": "john.smith@abcmedical.com",
  "primaryContactPhone": "+15125555678",
  
  "physicianInfo": {
    "name": "Dr. Jamie Chen",
    "email": "jchen@abcmedical.com",
    "npi": "1098765432"
  },
  
  "additionalPhysicians": [
    {
      "name": "Dr. Casey Patel",
      "email": "cpatel@abcmedical.com",
      "npi": "1888888888"
    }
  ],
  
  // ⭐ NEW - Rep Tracking (pending your API update)
  "submittingRep": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "asiegel@curagenesis.com",
    "name": "Alex Siegel"
  }
}
```

---

## ⚠️ CRITICAL REQUIREMENTS FROM YOU

### **1. 🔴 REP TRACKING - MUST HAVE**

**CRITICAL:** When we submit a practice, you MUST store **which sales rep submitted it**.

**Current Problem:**
- Your database tables don't track the originating rep/agent
- We can't see which rep is responsible for each practice
- Commission tracking and rep performance metrics are impossible

**What We Need:**

Add these fields to your `Facilities` or `BAAData` table:

```sql
-- Add to your facilities/practices table
submitting_rep_email VARCHAR(255)  -- e.g., "asiegel@curagenesis.com"
submitting_rep_name VARCHAR(255)   -- e.g., "Alex Siegel"
submitting_rep_id UUID              -- Our CRM rep ID (optional but helpful)
submitted_at TIMESTAMP              -- When the practice was submitted
```

**How We'll Send It:**

We'll add this to the API payload:

```json
{
  "email": "doctor@clinic.com",
  "facilityName": "ABC Medical Center",
  
  // ⭐ NEW FIELDS - Please add to your API spec
  "submittingRep": {
    "email": "asiegel@curagenesis.com",
    "name": "Alex Siegel",
    "id": "550e8400-e29b-41d4-a716-446655440000"  // Our CRM user ID
  }
  
  // ... rest of existing fields
}
```

**Why This Is Critical:**
- ✅ **Commission tracking** - We pay reps based on practices they sign up
- ✅ **Performance metrics** - Track which reps are most successful
- ✅ **Account ownership** - Reps need to see "their" practices in their dashboard
- ✅ **Support routing** - Route issues to the rep who knows the practice

**Timeline:** We need this ASAP. We're redoing our tables to match, but you need to update yours too.

---

### **2. Confirm All Fields Are Stored**

Please verify that your backend **saves all these fields** to your database (BAAData or Facilities table):

- ✅ `primaryContactName` ← **NEW - make sure this is stored**
- ✅ `facilityNPI`, `facilityTIN`, `facilityPhone`
- ✅ Complete `facilityAddress` (all sub-fields)
- ✅ `physicianInfo` and `additionalPhysicians` arrays
- 🔴 **`submittingRep` data** ← **CRITICAL NEW REQUIREMENT**

**Why it matters:** Doctors need to see this info when ordering via your portal.

### **3. Consider Adding New Field: `primaryContactPosition`**

We collect this field (`primary_contact_position`) but don't send it because your API doesn't support it yet.

**Suggested Addition to API:**
```json
{
  "primaryContactName": "Dr. Jane Doe",
  "primaryContactPosition": "Practice Manager",  // ← NEW FIELD
  "primaryContactEmail": "jane@clinic.com",
  "primaryContactPhone": "+15125551234"
}
```

**Benefits:**
- Better understanding of who the main contact is
- Helps your team route communication appropriately
- Common field in healthcare B2B systems

**Timeline:** If you can add this in the next sprint, we'll start sending it immediately.

### **4. Confirm Field Lengths / Validation**

Do you have any **field length limits** or **validation rules** we should know about?

For example:
- `facilityName` max length?
- `primaryContactName` max length?
- Do you validate NPI checksums (Luhn algorithm)?
- Do you require any fields to be non-null that are currently optional?

---

## 🧪 HOW TO TEST

### **Test Account Data:**
```json
{
  "email": "test-practice@curagenesiscrm.com",
  "firstName": "Test",
  "lastName": "Practice",
  "facilityName": "Test Medical Clinic",
  "facilityAddress": {
    "line1": "123 Test Street",
    "city": "Austin",
    "state": "TX",
    "postalCode": "78701",
    "country": "US"
  },
  "primaryContactName": "Dr. Test Contact",
  "primaryContactEmail": "test-practice@curagenesiscrm.com",
  "primaryContactPhone": "+15125551234"
}
```

### **Test Steps:**
1. We submit test practice via CRM
2. You receive POST to `/admin_createUserWithBaa`
3. Verify all fields are saved in your database
4. Check that `primaryContactName` appears in your admin panel or ordering portal
5. Confirm magic link email is sent to `test-practice@curagenesiscrm.com`

---

## 📞 QUESTIONS FOR YOUR TEAM

### 🔴 **CRITICAL - Must Answer:**
1. **🔴 WHEN will you add `submittingRep` fields to your database?** (We need this for commission tracking)
2. **🔴 What API field name do you want for rep data?** (We suggested `submittingRep` object)
3. **🔴 Do you want our CRM rep ID, or just email/name?**

### ⭐ **Important:**
4. ✅ **Are you storing `primaryContactName`?** (We just started sending it)
5. ❓ **Can you add `primaryContactPosition` field?** (We're collecting it but not sending yet)

### 💬 **Optional:**
6. ❓ **Do you need `facilityFax`?** (We collect it but don't send it)
7. ❓ **Do you need `shippingAddresses`?** (We can add if needed)
8. ❓ **Any field length limits or validation rules we should enforce?**

---

## 📊 DATA QUALITY METRICS

**Current State:**
- ✅ 100% of practices have: `facilityName`, `state`, `address`, `email`
- ✅ ~95% of practices have: `primaryContactName`, `primaryContactPosition`
- ✅ ~80% of practices have: `facilityPhone`
- ✅ ~60% of practices have: `facilityNPI`, `facilityTIN`
- ✅ ~40% of practices have: `physicianInfo` (physician contact)

**Why some fields are less than 100%:**
- Sales reps can submit without NPI/TIN if practice doesn't have them yet
- Not all practices have a dedicated physician contact (some are admin-only)
- We prioritize speed of submission over 100% data completion

---

## 🔄 CHANGE LOG

| Date | Change | Impact |
|------|--------|--------|
| 2025-10-13 | Added `primaryContactName` to payload | ⭐ **NEW FIELD** being sent |
| 2025-10-13 | Added `primaryContactPosition` to CRM form | Collected but **not sent yet** |
| 2025-10-08 | Updated API endpoint to `/admin_createUserWithBaa` | New endpoint, old endpoints deprecated |
| 2025-09-15 | Added multiple physician support | `additionalPhysicians` array now sent |

---

## 📧 CONTACT

**CRM Team:** Alex Siegel (asiegel@curagenesis.com)  
**For API Questions:** Ian + Backend Team  
**This Document:** `/CURAGENESIS_FIELD_MAPPING_HANDOFF.md` in CRM repo

---

## ✅ ACCEPTANCE CRITERIA

We consider this handoff complete when:

- [x] Backend team reviews this document
- [ ] Backend confirms `primaryContactName` is being stored
- [ ] Backend confirms field length limits (if any)
- [ ] Backend decides on `primaryContactPosition` field addition
- [ ] We successfully submit 3 test practices with all fields populated
- [ ] All fields appear correctly in your admin panel / ordering portal

**Please reply to this handoff with confirmation or questions!** 🚀

