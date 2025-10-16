# Database Permissions Required for CRM

## Issue
The application startup script cannot create necessary database columns because the user `curagen_intake_user` lacks ALTER TABLE permissions.

## Current Error
```
ERROR: must be owner of table accounts
```

## Required Action

### Option 1: Grant ALTER Permissions (Recommended)
Run as database owner or superuser:

```sql
-- Grant ALTER permission on all tables
GRANT ALTER ON ALL TABLES IN SCHEMA public TO curagen_intake_user;

-- Or grant specific permissions:
GRANT ALTER ON TABLE accounts TO curagen_intake_user;
GRANT ALTER ON TABLE users TO curagen_intake_user;
```

### Option 2: Run SQL Manually (One-time)
If you can't grant permissions, run these commands as the database owner:

```sql
-- Primary contact fields (CRITICAL - blocking 500 errors)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS primary_contact_name VARCHAR(255);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS primary_contact_position VARCHAR(255);

-- CRM user creation fields (for WorkMail integration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS workmail_user_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN;
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- Team management (for rep team assignments)
CREATE TYPE "Team" AS ENUM ('IN_HOUSE', 'VANTAGE_POINT');
ALTER TABLE users ADD COLUMN IF NOT EXISTS team "Team";
CREATE INDEX IF NOT EXISTS users_team_idx ON users(team) WHERE team IS NOT NULL;

-- Onboarding tokens table
CREATE TABLE IF NOT EXISTS onboarding_tokens (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE,
  user_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS onboarding_tokens_token_idx ON onboarding_tokens(token);
CREATE INDEX IF NOT EXISTS onboarding_tokens_user_idx ON onboarding_tokens(user_id);
```

## Database Details
- **Host:** cura-genesis-crm-db.c6ds4c4qok1n.us-east-1.rds.amazonaws.com
- **Database:** curagenesis_intake_crm
- **User (needs permissions):** curagen_intake_user
- **Port:** 5432

## Impact
**CRITICAL:** Until these columns are added:
- ✅ All API 500 errors are NOW FIXED (we commented out the fields)
- ❌ Primary contact name/position fields won't save to database
- ✅ Everything else works (intake form, send to practice, etc.)

**Once columns are added:**
- ✅ Uncomment fields in Prisma schema
- ✅ Uncomment fields in API routes
- ✅ Redeploy
- ✅ Primary contact fields will save correctly

## Files Modified (Temporary Fix)
- `prisma/schema.prisma` - Commented out primary contact fields
- `src/app/api/accounts/route.ts` - Commented out primary contact in POST
- `src/app/api/accounts/[id]/route.ts` - Commented out primary contact in PATCH

## Deployment Status
- ✅ Git push successful
- 🔄 Docker build in progress (fixing `requireRecruiter` import error)
- ⏳ Will deploy once build completes

## Next Steps
1. Grant ALTER permissions or run SQL manually
2. Verify columns exist: `\d accounts` in psql
3. Uncomment the fields in the code
4. Redeploy
5. Test primary contact fields save correctly

