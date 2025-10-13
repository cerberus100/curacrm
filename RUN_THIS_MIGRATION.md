# 🚨 CRITICAL: Database Migration Required

## Problem
The CRM is trying to use columns `primary_contact_name` and `primary_contact_position` that don't exist in the `accounts` table. This causes all KPI endpoints to fail with "column does not exist" errors.

## Solution
Run this SQL migration on your RDS database.

---

## Option 1: AWS RDS Query Editor (Easiest)

1. Go to AWS Console
2. Navigate to: **RDS → Query Editor**
3. Click "Connect to database"
4. Select:
   - **Database instance:** `cura-genesis-crm-db`
   - **Database name:** `curagenesis_intake_crm`
   - **Database username:** `crmuser` (master user)
5. Enter the master password for `crmuser`
6. Click "Connect"
7. Paste and run this SQL:

```sql
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS primary_contact_name TEXT,
ADD COLUMN IF NOT EXISTS primary_contact_position TEXT;
```

8. You should see: "Query executed successfully"

---

## Option 2: pgAdmin / Database Tool

If you have pgAdmin, DBeaver, or another database tool:

1. Connect to:
   - **Host:** `cura-genesis-crm-db.c6ds4c4qok1n.us-east-1.rds.amazonaws.com`
   - **Port:** `5432`
   - **Database:** `curagenesis_intake_crm`
   - **Username:** `crmuser` (master user)
   - **Password:** [your crmuser password]

2. Run this SQL:

```sql
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS primary_contact_name TEXT,
ADD COLUMN IF NOT EXISTS primary_contact_position TEXT;
```

---

## Option 3: Grant Permission (Then Auto-Migration Works)

If you want the CRM to auto-migrate in the future, grant permission:

```sql
-- Connect as crmuser (master) and run:
GRANT ALL PRIVILEGES ON TABLE accounts TO curagen_intake_user;
```

Then restart the CRM service and it will auto-apply migrations on startup.

---

## Verification

After running the migration, verify it worked:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'accounts' 
  AND column_name IN ('primary_contact_name', 'primary_contact_position');
```

You should see 2 rows returned.

---

## Impact

**Before migration:**
- ❌ Dashboard shows "Failed to load metrics"
- ❌ KPI endpoints return 500 errors
- ❌ Leaderboard won't load
- ❌ Segments won't load

**After migration:**
- ✅ Dashboard loads correctly
- ✅ All KPI metrics display
- ✅ Account creation with primary contact info works

---

## Why This Happened

The Prisma schema was updated to include these fields, but the actual database table wasn't migrated because:
1. The application user (`curagen_intake_user`) doesn't have ALTER TABLE permission
2. The table is owned by `crmuser` (master user)
3. Only the table owner or a superuser can ALTER TABLE

---

## Need Help?

If you don't have the `crmuser` password:
1. Check AWS Secrets Manager for RDS credentials
2. Check your password manager or deployment docs
3. You can reset the master password in AWS RDS Console (takes ~5 min)

