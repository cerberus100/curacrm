# Email Template for CuraGenesis Dev Team

---

**Subject:** CRM Field Mapping Update - New Data Being Sent

---

Hey Ian & Team,

Quick heads up: We've updated our CRM to send additional practice data to improve data quality in your system.

## 🆕 What's New

**NOW SENDING:**
- `primaryContactName` - Main practice contact name (e.g., "Dr. Jane Doe")

**COLLECTING BUT NOT SENDING YET:**
- `primaryContactPosition` - Their job title (e.g., "Practice Manager", "Medical Director")
  - **Reason not sent:** Your API doesn't have this field yet
  - **Question:** Can you add it? It would help identify who the main contact is

## 📄 Full Documentation

I've attached **CURAGENESIS_FIELD_MAPPING_HANDOFF.md** which includes:
- ✅ Complete field-by-field mapping (what we send vs what we collect)
- ✅ Example API payloads
- ✅ Test procedures
- ✅ Questions for your team

## ❓ Questions for You

1. **Is `primaryContactName` being stored?**  
   We just started sending it - can you confirm it's saving to your database?

2. **Can you add `primaryContactPosition` field?**  
   We're collecting it (95% of practices have it) but can't send it yet.  
   Would be valuable for your ordering portal to know if contact is doctor, manager, etc.

3. **Any field length limits?**  
   Do you have max character limits for fields like `facilityName`, `primaryContactName`, etc.?

4. **Are all fields accessible?**  
   When doctors log into your ordering portal, can they see all this practice info?

## 🧪 Test Request

Can we submit a test practice together to verify all fields are being saved correctly?

**Test data ready:**
```json
{
  "email": "test-practice@curagenesiscrm.com",
  "facilityName": "Test Medical Clinic",
  "primaryContactName": "Dr. Test Contact",
  "facilityAddress": {
    "line1": "123 Test Street",
    "city": "Austin",
    "state": "TX",
    "postalCode": "78701",
    "country": "US"
  }
}
```

Let me know when you're ready and I'll submit it!

## 📊 Current Data Quality

FYI, here's what percentage of our practices have each field:
- ✅ 100%: Practice name, state, address, email
- ✅ ~95%: Primary contact name & position
- ✅ ~80%: Phone number
- ✅ ~60%: NPI, TIN/EIN
- ✅ ~40%: Physician contact info

## 🎯 Next Steps

1. Your team reviews the field mapping doc
2. You confirm `primaryContactName` is being stored
3. We test a submission together
4. (Optional) You add `primaryContactPosition` field
5. (Optional) We start sending `primaryContactPosition`

Thanks! Let me know if you have any questions.

**Attachments:**
- CURAGENESIS_FIELD_MAPPING_HANDOFF.md (full documentation)
- DATA_COLLECTION_SUMMARY.md (reference)

---

Best,  
Alex Siegel  
CuraGenesis CRM Team  
asiegel@curagenesis.com

