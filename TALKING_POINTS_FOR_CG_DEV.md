# Talking Points for CuraGenesis Dev Call

**Date:** October 13, 2025  
**Attendees:** Alex (CuraGenesis CRM) + Ian/Dev Team (CuraGenesis Backend)

---

## 🎯 **Main Goal of This Call**

Get CuraGenesis backend to add **rep tracking** to their database so we can:
- ✅ Track which rep signed up each practice
- ✅ Calculate commissions accurately
- ✅ Show reps their own accounts in dashboards
- ✅ Measure rep performance

---

## 🔴 **CRITICAL ISSUE: No Rep Tracking**

### **The Problem:**
Your current database tables don't store **which sales rep submitted each practice**.

This means:
- ❌ We can't pay commissions (we don't know who signed up what)
- ❌ Reps can't see "their" practices in the CRM
- ❌ We can't measure rep performance
- ❌ Account ownership is unclear

### **What We Need:**

**Option 1: Simple (Minimum Viable)**
```sql
ALTER TABLE facilities ADD COLUMN submitting_rep_email VARCHAR(255);
ALTER TABLE facilities ADD COLUMN submitting_rep_name VARCHAR(255);
ALTER TABLE facilities ADD COLUMN submitted_at TIMESTAMP DEFAULT NOW();
```

**Option 2: Better (Recommended)**
```sql
-- Add a foreign key to a reps/users table
ALTER TABLE facilities ADD COLUMN submitting_rep_id UUID REFERENCES sales_reps(id);
ALTER TABLE facilities ADD COLUMN submitted_at TIMESTAMP DEFAULT NOW();

-- Create index for fast lookups
CREATE INDEX idx_facilities_submitting_rep ON facilities(submitting_rep_id);
```

### **How We'll Send It:**

We'll add this to the `/admin_createUserWithBaa` payload:

```json
{
  "email": "doctor@clinic.com",
  "facilityName": "ABC Medical Center",
  
  // ⭐ NEW FIELDS
  "submittingRep": {
    "id": "550e8400-e29b-41d4-a716-446655440000",  // Our CRM user ID
    "email": "asiegel@curagenesis.com",
    "name": "Alex Siegel"
  }
  
  // ... rest of existing fields
}
```

---

## 📊 **All Data We Capture**

### **Practice/Facility Data:**
- ✅ `facilityName` - Practice name
- ✅ `facilityNPI` - 10-digit organizational NPI
- ✅ `facilityTIN` / `facilityEIN` - Tax ID (9 digits)
- ✅ `facilityPhone` - Phone in E.164 format
- ✅ `facilityAddress` - Complete address (line1, line2, city, state, zip)
- ⭐ `primaryContactName` - **NEW** - Main contact name
- 💡 `primaryContactPosition` - **COLLECTED but not sent yet** (you need to add field)

### **Doctor/Physician Data:**
- ✅ `physicianInfo.name` - Primary physician name
- ✅ `physicianInfo.email` - Physician email
- ✅ `physicianInfo.npi` - Individual physician NPI
- ✅ `additionalPhysicians[]` - Array of additional physicians

### **Primary Contact (Who Gets Magic Link):**
- ✅ `email` - Their email
- ✅ `firstName` / `lastName` - Parsed from full name
- ✅ `primaryContactEmail` - Same as email
- ✅ `primaryContactPhone` - Contact phone

### **Onboarding Status:**
- ✅ `baaSigned: false` - They haven't signed BAA yet
- ✅ `paSigned: false` - They haven't signed PA yet

### **Rep Data (NEEDS TO BE ADDED):**
- 🔴 `submittingRep.id` - Our CRM user ID
- 🔴 `submittingRep.email` - Rep's email
- 🔴 `submittingRep.name` - Rep's name

---

## 📄 **Reference Documents**

I'm sending you 2 documents:

1. **`CURAGENESIS_FIELD_MAPPING_HANDOFF.md`**
   - Complete field-by-field mapping
   - Example payloads
   - SQL schema suggestions
   - Test data

2. **`DATA_COLLECTION_SUMMARY.md`**
   - Quick reference of all data we collect
   - What we send vs what we keep internal

---

## ❓ **Questions to Ask Them**

### **🔴 Critical (Must Get Answered):**

1. **"When can you add `submittingRep` fields to your database?"**
   - We need this ASAP for commission tracking
   - Can you do it this sprint? Next sprint?

2. **"What field name do you want us to use in the API?"**
   - We suggested `submittingRep` object
   - Do you prefer something else? (`salesRep`? `accountOwner`?)

3. **"Do you want our CRM user ID (UUID) or just email/name?"**
   - UUID is better for data integrity
   - Email/name is simpler but can change

### **⭐ Important:**

4. **"Are you storing `primaryContactName`?"**
   - We just started sending it
   - Please confirm it's being saved

5. **"Can you add `primaryContactPosition` field?"**
   - We're collecting it (Practice Manager, Medical Director, etc.)
   - Would help you understand who the main contact is

### **💬 Nice to Have:**

6. **"Do you have field length limits?"**
   - Max length for `facilityName`?
   - Max length for `primaryContactName`?

7. **"Do you need other fields we're not sending?"**
   - We collect: `specialty`, `ehrSystem`, `website`, `leadSource`
   - Currently internal-only, but can send if useful

---

## 🎯 **Ideal Outcome**

**Best Case:**
- ✅ They agree to add `submittingRep` fields
- ✅ They give us a timeline (this sprint? next sprint?)
- ✅ They confirm field name to use
- ✅ They confirm `primaryContactName` is being stored
- ✅ (Bonus) They add `primaryContactPosition` field

**Minimum Acceptable:**
- ✅ They agree to add `submittingRep.email` and `submittingRep.name` (minimum)
- ✅ They give us a timeline (within 2 weeks)

**Unacceptable:**
- ❌ "We don't need rep tracking" - Push back hard, this is critical
- ❌ "We'll do it eventually" - Get a specific date

---

## 💬 **How to Frame It**

**"Look, we're building a full CRM to manage our sales team. We have 10+ reps signing up practices. Without rep tracking on your side, we can't:**
- **Pay commissions** - We literally don't know who signed up what
- **Measure performance** - Can't see which reps are crushing it
- **Show reps their accounts** - They need to see "their" practices
- **Route support** - When a practice has an issue, we need to know their rep

**We're redoing our entire database schema to fit your system. We need you to add these 3 fields to your tables so we can actually use this integration."**

---

## 📧 **Follow-Up Email**

After the call, send them:
- ✅ `CURAGENESIS_FIELD_MAPPING_HANDOFF.md` (full spec)
- ✅ Summary of what they agreed to
- ✅ Timeline for implementation
- ✅ Test data for validation

---

## 🚨 **If They Push Back**

**"We don't have that in our schema"**
→ "That's why we're asking you to add it. It's 3 columns. We can help with the SQL."

**"We don't track reps on our side"**
→ "You don't need to track YOUR reps. Just store OUR rep who submitted each practice. We'll send it, you just save it."

**"Why can't you track it on your side?"**
→ "We do track it on our side. But when the doctor logs into YOUR ordering portal, we need them to see their rep's info. Also, your reporting/exports should include rep data."

**"This is a big change"**
→ "It's 3 database columns. We're literally telling you what data to store. This is standard for B2B integrations."

---

**Good luck! 🚀 Stand firm on the rep tracking - it's non-negotiable.**

