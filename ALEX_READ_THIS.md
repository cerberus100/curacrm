# ⚠️ ALEX - IGNORE IAN'S INSTRUCTIONS! ⚠️

**Date:** October 13, 2025  
**Status:** Ian is confused about your architecture

---

## 🚨 **IAN IS WRONG - Here's Why:**

### **What Ian Thinks:**
- Your CRM queries CuraGenesis DynamoDB (BAAData table)
- You need to fetch `primaryContactName` from their database

### **What's Actually True:**
- ✅ **Your CRM uses PostgreSQL** (NOT DynamoDB)
- ✅ **Your CRM ONLY SENDS data TO CuraGenesis** (doesn't query their DB)
- ✅ **You have your OWN accounts table** with its own schema
- ✅ **The columns ARE in your Prisma schema** (just not in the database yet)

---

## ✅ **What You ACTUALLY Need to Do:**

### **Option 1: Run Migration on Production Database**

The `primary_contact_name` and `primary_contact_position` columns are defined in your `prisma/schema.prisma` file, but haven't been added to the production database yet.

**Via AWS RDS Query Editor:**
```sql
-- Add the columns
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS primary_contact_name TEXT,
ADD COLUMN IF NOT EXISTS primary_contact_position TEXT;

-- Verify
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'accounts' 
AND column_name LIKE 'primary_contact%';
```

### **Option 2: Update via ECS Task**

SSH into your ECS container and run:
```bash
npx prisma db push
```

---

## 📊 **Your Architecture (CORRECT):**

```
┌─────────────────────────────────┐
│  YOUR CRM (PostgreSQL)          │
│  - accounts table               │
│  - contacts table               │
│  - primary_contact_name field   │  ← Needs to be added to DB
│  - primary_contact_position     │  ← Needs to be added to DB
└─────────────────────────────────┘
          │
          │ (Sends data via API)
          ↓
┌─────────────────────────────────┐
│  CURAGENESIS (DynamoDB)         │
│  - BAAData table                │
│  - Facilities table             │
│  - primaryContactName field     │  ← Their field (you send to this)
└─────────────────────────────────┘
```

---

## 🎯 **The Real Problem:**

Your Prisma schema has the fields:
```prisma
model Account {
  // ... other fields
  primaryContactName     String?  @map("primary_contact_name")
  primaryContactPosition String?  @map("primary_contact_position")
}
```

But your **production PostgreSQL database** doesn't have these columns yet!

---

## ✅ **The Solution:**

**Run this SQL on your RDS database:**

```sql
-- Connect to your production database
-- Then run:

ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS primary_contact_name TEXT;

ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS primary_contact_position TEXT;

-- Also add the team column while you're at it:
CREATE TYPE "Team" AS ENUM ('IN_HOUSE', 'VANTAGE_POINT');

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS team "Team";

CREATE INDEX IF NOT EXISTS users_team_idx ON users(team) WHERE team IS NOT NULL;
```

---

## 🔧 **How to Run the Migration:**

### **Method 1: AWS RDS Query Editor**
1. Go to AWS Console → RDS
2. Select your database: `curagenesis_crm`
3. Click "Query Editor"
4. Run the SQL above

### **Method 2: psql Command**
```bash
# Get your DATABASE_URL from ECS task definition or Secrets Manager
psql $DATABASE_URL << EOF
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS primary_contact_name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS primary_contact_position TEXT;
EOF
```

### **Method 3: From ECS Container**
```bash
# SSH into your ECS task
aws ecs execute-command \
  --cluster curagenesis-cluster \
  --task <TASK_ID> \
  --container curagenesis-crm \
  --interactive \
  --command "/bin/sh"

# Then inside the container:
npx prisma db push
```

---

## 🚫 **DO NOT:**

❌ Query CuraGenesis DynamoDB  
❌ Fetch from BAAData table  
❌ Use AWS SDK to get `primaryContactName`  
❌ Follow Ian's "Quick Fix" instructions

---

## ✅ **DO:**

✅ Add columns to YOUR PostgreSQL database  
✅ Use your existing Prisma schema  
✅ Run the SQL migration above  
✅ Restart ECS service after migration

---

## 📞 **After You Run the Migration:**

1. Hard refresh dashboard: `https://curagenesiscrm.com/dashboard`
2. Errors should disappear
3. Dashboard KPIs should load
4. EIN/TIN field should work

---

## 🎯 **Bottom Line:**

**Ian gave you instructions for THEIR backend, not yours!**

You don't need to query their DynamoDB - you just need to add the missing columns to YOUR PostgreSQL database.

**Run the SQL above, and you're done!** 🚀

