# CuraGenesis Intake CRM - Quick Start Guide

Get up and running in 5 minutes!

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
Create `.env` file:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/curagenesis_crm"
CURAGENESIS_API_BASE="https://api.curagenesis.com"
CURAGENESIS_API_KEY="your_api_key_here"
CURAGENESIS_API_TIMEOUT_MS="10000"
NEXT_PUBLIC_CG_METRICS_BASE="https://api.curagenesis.com"
CG_METRICS_API_KEY="your_metrics_key_here"
```

### 3. Initialize Database
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000 🎉

## 📝 Test the System

### Create Your First Account

1. Navigate to **Intake** in the left sidebar
2. Click **New Account**
3. Fill in required fields:
   - Practice Name: "ABC Medical Center"
   - Specialty: "Family Medicine"
   - State: "CA"
4. Click **Save**

### Add a Contact

1. After saving, scroll to the **Contacts** section
2. Click **Add Contact**
3. Fill in:
   - Full Name: "Dr. John Smith"
   - Contact Type: "Clinician"
   - Email: "jsmith@abc.com"
   - Phone: "(555) 123-4567"
4. Click **Add Contact**

### Send to CuraGenesis

1. Click **Send to CuraGenesis** button
2. Confirm in the modal
3. View success toast notification
4. Navigate to **Submissions** to see the result

### View KPIs

1. Navigate to **Dashboard**
2. See overview metrics, charts, and leaderboard
3. Change date range (30d, 60d, 90d)

## 🎨 Key Features to Try

### Phone Formatting
Type any phone number and watch it auto-format to `(XXX) XXX-XXXX`

### NPI Validation
Enter a 10-digit NPI in account or contact forms

### Duplicate Prevention
Try sending the same account twice - the idempotency key prevents duplicates

### Error Handling
Intentionally break validation (e.g., leave required fields empty) to see inline errors

### Submission History
Check **Submissions** page to see all attempts with request/response details

## 🔧 Common Tasks

### View Database
```bash
npm run db:studio
```
Opens Prisma Studio at http://localhost:5555

### Reset Database
```bash
npm run db:push -- --force-reset
npm run db:seed
```

### Type Check
```bash
npm run type-check
```

### Lint
```bash
npm run lint
```

## 📚 Seed Data

After running `npm run db:seed`, you'll have:

**Users:**
- Admin: `admin@curagenesis.com`
- Rep: `rep@curagenesis.com`

**Sample Account:**
- Practice: "Sample Medical Center"
- Location: San Francisco, CA
- Contact: Dr. Jane Smith

## 🎯 Workflow Overview

```
Create Account → Add Contacts → Send to CuraGenesis → View in Submissions
                                                    ↓
                                          Check KPI Dashboard
```

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
psql postgres://postgres:postgres@localhost:5432/postgres

# Create database manually
createdb curagenesis_crm
```

### API Key Issues
- Double-check `.env` file has correct keys
- Keys should be strings without quotes in the actual values
- Restart dev server after changing `.env`

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Prisma Client Out of Sync
```bash
npm run db:generate
```

## 📖 Next Steps

1. Read [README.md](./README.md) for full documentation
2. Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
3. Review [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup

## 💡 Tips

- **Keyboard Shortcuts:** Most forms support Tab navigation
- **Toast Notifications:** Watch the top-right for feedback
- **Status Badges:** Color-coded for quick status recognition
- **Inline Validation:** Errors appear as you type
- **Auto-Save:** Account form saves before sending

## 🎨 Brand Theme

The app uses CuraGenesis brand colors:
- Primary: Deep blue (#083d4f)
- Accent: Dark teal (#042937)
- Background: Very dark blue (#0c1d25)

All cards use rounded corners (rounded-2xl) and consistent spacing.

## 📞 Support

- **Issues:** Check [ARCHITECTURE.md](./ARCHITECTURE.md) troubleshooting section
- **Questions:** Review [README.md](./README.md) FAQ
- **Bugs:** Create a GitHub issue

---

**Happy coding! 🚀**
