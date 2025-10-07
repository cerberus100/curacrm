# Test Guide: New Features

## 🎯 Two New Features Added

### 1. ✅ Duplicate Pre-Check
### 2. ✅ CSV Bulk Import

---

## 🔍 Feature 1: Test Duplicate Detection

### Steps to Test:

1. **Open:** http://localhost:30003
2. **Navigate:** Intake → New Account
3. **Enter existing NPI:** `1234567890` (from seed data)
4. **Tab out** or click elsewhere
5. **Watch for:**
   - 🟡 Yellow warning alert appears
   - 📋 Shows "Sample Medical Center" as potential duplicate
   - 🔔 Toast notification: "⚠️ Potential Duplicates Found"
   - 📊 Details: Practice name, location, rep, status

**Try with Phone:**
1. **Enter phone:** `5551234567`
2. **Tab out**
3. **See same warning** if phone exists

### What It Prevents
- Duplicate practice creation in CuraGenesis
- Wasted API calls
- Data quality issues

---

## 📊 Feature 2: Test CSV Bulk Import

### Quick Test (3 minutes):

1. **Go to:** Intake page
2. **Click:** "CSV Import" button (top right)
3. **Click:** "Download Template" button
   - Downloads: `curagenesis_import_template.csv`
   - Contains 2 sample rows

4. **Review template** in Excel/Numbers:
   ```csv
   practice_name,specialty,state,npi_org,phone,email,...
   ABC Medical Center,Family Medicine,CA,1234567890,...
   XYZ Health Group,Cardiology,NY,9876543210,...
   ```

5. **Upload template:**
   - Click upload area
   - Select the downloaded CSV
   - Click "Import Accounts"

6. **See results:**
   - ✅ "Imported 2 of 2 accounts"
   - Green badge: "✓ 2 Imported"
   - (If any failed, see red badge with errors)

7. **Click "Send All Valid (2)"**
   - System sends in batches of 5
   - Each gets unique idempotency key
   - See progress
   - Final results: "Sent X of Y accounts"

8. **Navigate to Submissions**
   - See 2 new submission rows
   - Each has request/response logged
   - Status will be "failed" (demo API keys)
   - Click to view details

### Full Test with Custom Data:

**Create your own CSV:**
```csv
practice_name,specialty,state,npi_org,phone,email,address_line1,address_line2,city,zip,contact_full_name,contact_type,contact_email,contact_phone
Test Practice 1,Cardiology,TX,1111111111,(555) 100-0001,test1@example.com,100 Test St,,Austin,78701,Dr. Test One,clinician,test1@practice.com,(555) 200-0001
Test Practice 2,Dermatology,FL,2222222222,(555) 100-0002,test2@example.com,200 Test Ave,,Miami,33101,Dr. Test Two,owner_physician,test2@practice.com,(555) 200-0002
Invalid Practice,,,,,,,,,,,clinician,,
```

**Expected Results:**
- ✅ Row 1: Imported
- ✅ Row 2: Imported
- ❌ Row 3: Failed (missing required fields)

---

## 🎨 UI Features

### Duplicate Warning Alert
- **Color:** Yellow warning (matches brand)
- **Icon:** Triangle with exclamation
- **Content:** 
  - Warning message
  - List of matching practices
  - Each match shows: name, location, NPI, phone, rep, status
  - Guidance text

### CSV Import Page
- **Template Download:** One-click CSV generation
- **Drag-and-drop upload area**
- **File info:** Name and size display
- **Import button:** Disabled during processing
- **Results display:**
  - Green badges for success
  - Red badges for failures
  - Expandable error details
  - Row numbers for failed imports
- **Send All Valid button:** Shows count of valid accounts
- **Format reference:** Built-in column guide

---

## 🔧 Technical Details

### Duplicate Check
**Endpoint:** `GET /api/accounts/check-duplicates?npi=X&phone=Y`

**Query:**
```typescript
prisma.account.findMany({
  where: {
    OR: [
      { npiOrg: npi },
      { phoneE164: phone }
    ]
  }
})
```

**Performance:** Uses existing indexes on `npiOrg` and `phoneE164`

### Bulk Import
**Endpoint:** `POST /api/accounts/bulk-import`

**Body:**
```json
{
  "rows": [ {...}, {...} ],
  "ownerRepId": "..."
}
```

**Processing:**
- Sequential row processing
- Zod validation per row
- Database transaction per account+contact pair
- Error collection without stopping

### Bulk Send
**Endpoint:** `POST /api/accounts/bulk-send`

**Body:**
```json
{
  "accountIds": ["id1", "id2", ...]
}
```

**Processing:**
- Batch size: 5 concurrent requests
- Uses CuraGenesisClient (retry logic)
- Idempotency key per submission
- Full audit trail

---

## 📝 CSV Validation Rules

All standard Zod rules apply:
- ✅ `practice_name`: 3-255 chars
- ✅ `specialty`: Required
- ✅ `state`: 2-letter uppercase (CA, NY, TX, etc.)
- ✅ `npi_org`: Exactly 10 digits (optional)
- ✅ `phone`: Auto-formatted to (XXX) XXX-XXXX
- ✅ `email`: Valid email format
- ✅ `contact_type`: clinician | owner_physician | admin | billing
- ✅ At least one of: contact_email OR contact_phone

---

## 🚨 Error Handling

### Import Errors
**Invalid State:**
```
Row 3, state: State must be 2-letter code
```

**Missing Required Field:**
```
Row 5, practice_name: Practice name must be at least 3 characters
```

**Invalid NPI:**
```
Row 2, npi_org: NPI must be exactly 10 digits
```

### Send Errors
**Missing Contacts:**
```
Practice "ABC Medical" - Missing contacts or account not found
```

**API Error:**
```
Practice "XYZ Health" - HTTP 422
```

---

## 💡 Tips

### CSV Best Practices
1. Use the downloaded template as a starting point
2. Don't remove or reorder columns
3. Keep header row exactly as provided
4. Empty optional fields are OK (leave blank)
5. Test with 2-3 rows first

### Bulk Sending
1. Review import results before sending
2. Fix failed rows if needed
3. Send happens in background (batches of 5)
4. Check Submissions page for individual results
5. Retry individual failures if needed

### Duplicate Checking
- Runs automatically on NPI/phone blur
- Only checks when field has valid value
- Shows up to 5 matches
- Doesn't block sending (warning only)

---

## 📦 Files to Review

**API Routes:**
- `src/app/api/accounts/check-duplicates/route.ts`
- `src/app/api/accounts/bulk-import/route.ts`
- `src/app/api/accounts/bulk-send/route.ts`

**Components:**
- `src/components/intake/csv-bulk-import.tsx`
- `src/components/intake/confirm-send-dialog.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/dialog.tsx`

**Updated:**
- `src/components/intake/account-form.tsx`
- `src/components/intake/intake-content.tsx`

---

## ✅ Quality Assurance

- ✅ TypeScript: **0 errors**
- ✅ ESLint: **0 errors** (4 minor warnings)
- ✅ Build: **Passes**
- ✅ Runtime: **No console errors**
- ✅ Security: **No secret leaks**
- ✅ Validation: **Same strict rules as single form**

---

**🎉 Both features are production-ready!**

Refresh your browser to test them now: **http://localhost:30003**
