# Local Testing Guide

## ⚠️ Important: No Authentication System

This application **does not have a login system**. It's designed as an internal tool with direct access. When you open the app, you'll immediately see the dashboard.

The "admin" and "rep" users exist in the database for data ownership purposes only (accounts are assigned to reps), but there's no login screen.

## 🧪 How to Test

### 1. Access the Application

After starting the server with `npm run dev`, open:
- **URL:** http://localhost:3000
- You'll be redirected to `/dashboard` automatically
- No login required - direct access to all features

### 2. Test User Data

After running the seed command, you'll have:

**Admin User:**
- ID: `00000000-0000-0000-0000-000000000001`
- Name: Admin User
- Email: admin@curagenesis.com
- Role: admin

**Sales Rep:**
- ID: `00000000-0000-0000-0000-000000000002`
- Name: Sales Rep
- Email: rep@curagenesis.com
- Role: rep

**Sample Account:**
- Practice: Sample Medical Center
- Specialty: Family Medicine
- Location: San Francisco, CA
- Contact: Dr. Jane Smith

### 3. Test Workflow

#### A. View Dashboard
1. Open http://localhost:3000
2. See KPI cards (will show mock data or API errors if keys not configured)
3. Try date range selector (30d/60d/90d)

#### B. Create New Account
1. Click **Intake** in left sidebar
2. Click **New Account**
3. Fill in form:
   - Practice Name: "Test Medical Group"
   - Specialty: "Family Medicine"
   - State: "CA"
   - Phone: Type any number, watch it format to (XXX) XXX-XXXX
   - NPI: "1234567890" (10 digits)
4. Click **Save**

#### C. Add Contact
1. After saving account, scroll to **Contacts** section
2. Click **Add Contact**
3. Fill in:
   - Full Name: "Dr. Sarah Johnson"
   - Contact Type: "Clinician"
   - Email: "sjohnson@test.com"
   - Phone: "5551234567"
4. Click **Add Contact**

#### D. Send to CuraGenesis (Will Fail Without Real API Key)
1. Click **Send to CuraGenesis** button
2. You'll get an error because demo API keys aren't real
3. Check **Submissions** page to see the attempt was logged
4. Click on submission to view request/response details

#### E. View Submissions
1. Click **Submissions** in left sidebar
2. See all submission attempts
3. Click any row to see detailed drawer with:
   - Request payload
   - Response (if any)
   - Error message
   - Idempotency key

### 4. Test with Real API Keys

To actually send to CuraGenesis:

1. Update `.env` with real keys:
   ```env
   CURAGENESIS_API_KEY="your_real_api_key"
   CG_METRICS_API_KEY="your_real_metrics_key"
   ```

2. Restart server:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

3. Try sending an account again

### 5. Features to Test

✅ **Phone Formatting**
- Type: `5551234567` → Auto-formats to `(555) 123-4567`

✅ **NPI Validation**
- Try 9 digits → Error: "Must be 10 digits"
- Enter 10 digits → Accepts

✅ **Required Fields**
- Leave Practice Name empty → Inline error
- Leave State empty → Error on save

✅ **Contact Requirement**
- Try sending without contacts → Error: "Add at least one contact"

✅ **Status Tracking**
- Draft → Sent → Failed states
- Color-coded badges

✅ **Idempotency**
- Send same account twice (if API keys work)
- Second attempt reuses same idempotency key within 24h

✅ **Friendly Errors**
- 409 → "Practice may already exist"
- 422 → "Check NPI/Email/State"
- Network error → "Timeout, try again"

### 6. View Database

Open Prisma Studio to see all data:
```bash
npx prisma studio
```

Opens at http://localhost:5555

You can:
- Browse all tables
- See accounts, contacts, submissions
- Edit data directly
- Delete test data

### 7. Test KPI Dashboard

The KPI dashboard requires real CuraGenesis Metrics API keys. Without them:

- You'll see "Failed to load metrics" error
- This is expected with demo keys
- The UI will still render properly
- Charts show empty state gracefully

With real keys:
- Overview metrics populate
- Charts render with data
- Geo breakdown shows states
- Leaderboard populates

### 8. Admin Page

1. Click **Admin** in sidebar
2. See system health status
3. Check environment configuration

### 9. Common Test Scenarios

#### Scenario 1: Happy Path
```
Create Account → Add Contact → Send → View Submission
```

#### Scenario 2: Validation Errors
```
Leave fields empty → See inline errors → Fix → Save successfully
```

#### Scenario 3: Multiple Contacts
```
Create Account → Add 3 contacts → Send → View in submissions
```

#### Scenario 4: Edit Existing
```
Intake list → Click account → Edit fields → Save → See updated
```

#### Scenario 5: Delete Contact
```
Open account → Click trash icon on contact → Confirm → Deleted
```

### 10. Reset Test Data

To start fresh:
```bash
npx prisma db push --force-reset
npx prisma db seed
```

This will:
- Drop all tables
- Recreate schema
- Re-seed with admin, rep, and sample account

## 🎨 UI Testing Checklist

- [ ] Navigation works (Dashboard, Intake, Submissions, Admin)
- [ ] Toast notifications appear on actions
- [ ] Loading states show during API calls
- [ ] Forms validate on blur
- [ ] Buttons disable during submission
- [ ] Status badges have correct colors
- [ ] Phone numbers auto-format
- [ ] Date/time displays correctly
- [ ] Charts render (if API keys work)
- [ ] Tables are sortable/clickable
- [ ] Drawers open/close smoothly
- [ ] Responsive on mobile (resize browser)

## 🐛 Expected "Errors" (These are OK)

1. **KPI API Errors:** Without real metrics API key, dashboard will show error
2. **Submission Failures:** Without real intake API key, sends will fail (but get logged)
3. **Console Warnings:** Some React/Next.js dev warnings are normal

## ✅ What Should Work

- ✅ Creating/editing accounts
- ✅ Adding/editing/deleting contacts
- ✅ Form validation
- ✅ Phone formatting
- ✅ NPI validation
- ✅ Saving to database
- ✅ Viewing submissions history
- ✅ Status tracking
- ✅ UI navigation
- ✅ Toast notifications
- ✅ Submission drawer details

## 🚫 What Requires Real API Keys

- ❌ Successful CuraGenesis submissions
- ❌ KPI metrics loading
- ❌ Charts with real data
- ❌ Leaderboard population

---

**Ready to test? Start with creating your first account in the Intake section!** 🚀
