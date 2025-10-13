# Quick Summary: CuraGenesis Dev Handoff

**Date:** October 13, 2025  
**Status:** ✅ Code updated, ready for backend confirmation

---

## 🎯 What We Did

1. ✅ **Updated CRM code** to send `primaryContactName` to CuraGenesis API
2. ✅ **Created comprehensive handoff document** for their dev team
3. ✅ **Verified all fields** we collect vs what we send

---

## 📄 Documents Created

### 1. **CURAGENESIS_FIELD_MAPPING_HANDOFF.md** (Main Document)
- Complete field-by-field mapping
- What we send vs what we collect
- Example payloads
- Questions for their team
- Test procedures

### 2. **DATA_COLLECTION_SUMMARY.md** (Reference)
- All data we collect in CRM
- Database schema details
- Data flow diagrams

### 3. **This Summary** (Quick Reference)

---

## 🚀 What We're Sending Now (Changes)

| Field | Status | Notes |
|-------|--------|-------|
| `primaryContactName` | ⭐ **NOW SENDING** | Was collected but not sent before |
| `primaryContactPosition` | 📋 Collected, NOT sent | Their API doesn't support it yet |

---

## 💬 What to Tell Their Dev Team

**Send them this:**

```
Hey Ian/Team,

We've updated our CRM to send more practice data. Here's what's new:

✅ NOW SENDING: `primaryContactName` field 
   (e.g., "Dr. Jane Doe" - the main practice contact)

📋 COLLECTING BUT NOT SENDING: `primaryContactPosition` 
   (e.g., "Practice Manager" - their job title)

QUESTION: Can you add `primaryContactPosition` field to your API?
It would help you understand who the main contact is (doctor, manager, admin, etc.)

📄 FULL DETAILS: See attached CURAGENESIS_FIELD_MAPPING_HANDOFF.md

This documents:
- Every field we send (with examples)
- Fields we collect but don't send
- Test payloads
- Questions for you

PLEASE CONFIRM:
1. Is `primaryContactName` being stored in your database?
2. Can you add `primaryContactPosition` in a future sprint?
3. Any field length limits we should enforce?

Thanks!
- Alex
```

---

## ✅ Code Changes Made

### 1. **src/lib/validations.ts**
- Added `primaryContactName` and `primaryContactPosition` to `IntakePayloadSchema`
- Made `rep` field optional (was breaking validation)

### 2. **src/app/api/submissions/send/route.ts**
- Now includes `primaryContactName` and `primaryContactPosition` in API payload

### 3. **src/lib/curagenesis-client.ts**
- Uses `primaryContactName` from form if available
- Falls back to first contact's full name if not provided

---

## 🧪 How to Test

### **On Production:**

1. Go to https://curagenesiscrm.com/intake
2. Create new practice:
   - Practice Name: "Test Medical Clinic"
   - **Primary Contact Name: "Dr. Test Contact"** ← NEW FIELD
   - **Position/Title: "Practice Manager"** ← NEW FIELD  
   - State: TX
   - Address: 123 Test St, Austin, TX, 78701
3. Add contact:
   - Name: Dr. Test Contact
   - Email: test@example.com
   - Type: PHYSICIAN
4. Click "Send to CuraGenesis"
5. Check response - should include `userId`
6. **Ask their team to verify:** Does their database show `primaryContactName = "Dr. Test Contact"`?

---

## 📊 Field Summary

### **Fields We Send:**
- ✅ `email`, `firstName`, `lastName`
- ✅ `facilityName`, `facilityAddress` (complete)
- ✅ `facilityNPI`, `facilityTIN`, `facilityPhone`
- ✅ **`primaryContactName`** ← NEW
- ✅ `primaryContactEmail`, `primaryContactPhone`
- ✅ `physicianInfo`, `additionalPhysicians`
- ✅ `baaSigned`, `paSigned` (always false)

### **Fields We Collect But DON'T Send:**
- ❌ `specialty`, `ehrSystem`, `website`, `leadSource` (internal CRM use)
- ❌ **`primaryContactPosition`** (their API doesn't support it yet)
- ❌ Non-physician contacts (practice managers, nurses, admins)

### **Fields They Support But We DON'T Collect:**
- ❌ `selectedFacility`, `facilityPTAN`, `facilityFax`
- ❌ `shippingContact`, `shippingAddresses`

---

## ⚠️ Action Required

### **From Their Team:**

1. **Confirm** `primaryContactName` is being stored
2. **Decide** if they want `primaryContactPosition` field added to API
3. **Provide** any field length limits or validation rules
4. **Test** with a sample submission to verify all fields are saved

### **From Us:**

1. ✅ Code is updated and deployed (done)
2. ✅ Handoff document created (done)
3. ⏳ Waiting for their confirmation
4. ⏳ Can add `primaryContactPosition` to API payload once they add the field

---

## 📞 Next Steps

1. **Send handoff document** to their dev team
2. **Wait for confirmation** that fields are being stored
3. **Test submission** together to verify
4. **Add `primaryContactPosition`** to API payload once they support it

---

## 🎉 Success Criteria

- [ ] Their team reviews handoff document
- [ ] They confirm `primaryContactName` is stored
- [ ] Test submission shows all fields in their database
- [ ] (Optional) They add `primaryContactPosition` field to API
- [ ] (Optional) We update code to send `primaryContactPosition`

---

**Status: Ready for their review! 🚀**

