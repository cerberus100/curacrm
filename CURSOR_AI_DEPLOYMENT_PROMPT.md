# Cursor AI Prompt - Deploy CuraGenesis CRM to Production

**Copy and paste this entire prompt into Cursor AI to automatically deploy the CRM**

---

## CONTEXT FOR CURSOR AI

You are helping deploy the CuraGenesis CRM application to AWS production account 516267217490.

**Current situation:**
- Docker image exists in ECR: `337909762852.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest`
- ECS service exists: `curagenesis-cluster` / `curagenesis-crm`
- RDS database exists: `curagenesis-crm-db.corg4gc86qjy.us-east-1.rds.amazonaws.com`
- CRM loads but login fails because database tables don't exist
- Region: us-east-1

**Files provided by Alex:**
- `database-init.sql` - Creates all required database tables
- `EMOJI_FIX_DEPLOYMENT.md` - Deployment instructions
- `FINAL_DEPLOYMENT_INSTRUCTIONS.md` - Complete guide
- `production-task-definition-FIXED.json` - Correct ECS configuration

---

## YOUR TASK

Execute these steps in order to get the CRM fully operational:

### Step 1: Initialize Database

Connect to RDS and create all required tables.

**Database credentials:**
- Host: `curagenesis-crm-db.corg4gc86qjy.us-east-1.rds.amazonaws.com`
- Port: 5432
- Database: `curagenesis_crm`
- Username: `curagen_crm_user`
- Password: `CuraGenCRM2024!`

**Action:** Read the file `database-init.sql` and execute it in the RDS database.

**Method:** Use AWS RDS Query Editor or psql command:
```bash
psql "postgresql://curagen_crm_user:CuraGenCRM2024!@curagenesis-crm-db.corg4gc86qjy.us-east-1.rds.amazonaws.com:5432/curagenesis_crm" -f database-init.sql
```

**Expected result:** All tables created (users, accounts, contacts, submissions, activity_log, rep_profiles, etc.)

**Verify:** Run this query after completion:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

Should show at least: accounts, activity_log, contacts, onboarding_tokens, rep_profiles, settings, submissions, users

---

### Step 2: Pull Latest Docker Image

The latest image has emoji encoding fixes.

**Action:** Pull the latest image from Alex's ECR and push to production ECR.

```bash
# Login to Alex's ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 337909762852.dkr.ecr.us-east-1.amazonaws.com

# Pull latest image
docker pull 337909762852.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest

# Tag for production
docker tag 337909762852.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest \
  516267217490.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest

# Login to production ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 516267217490.dkr.ecr.us-east-1.amazonaws.com

# Push to production
docker push 516267217490.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest
```

**Expected result:** Image successfully pushed to production ECR

---

### Step 3: Deploy to ECS

Force a new deployment to pull the latest image.

**Action:** Update the ECS service to use the latest image.

```bash
aws ecs update-service \
  --cluster curagenesis-cluster \
  --service curagenesis-crm \
  --force-new-deployment \
  --region us-east-1

# Wait for deployment to complete
aws ecs wait services-stable \
  --cluster curagenesis-cluster \
  --services curagenesis-crm \
  --region us-east-1
```

**Expected result:** Service stable with runningCount: 1

---

### Step 4: Monitor Deployment

Watch CloudWatch logs to verify successful startup.

**Action:** Tail the logs and look for key messages.

```bash
aws logs tail /ecs/curagenesis-crm --follow --region us-east-1
```

**Look for these critical lines:**
```
Starting CuraGenesis CRM...
[SCHEMA] Running schema updates...
[OK] Schema updates complete
[ADMIN] Ensuring admin user exists...
[OK] Admin user exists
Email: Admin Email: admin@curagenesis.com
Password: Admin Password: Money100!
[OK] Initialization complete!
[SERVER] Starting Next.js server...
▲ Next.js 14.2.13
✓ Ready in XXXms
```

**If you see all those messages, the CRM is ready!**

---

### Step 5: Test Login

Verify admin login works.

**Action:** Test the login endpoint and verify authentication.

**URL:** `https://crm.curagenesis.com/login`

**Credentials:**
- Email: `admin@curagenesis.com`
- Password: `Money100!`

**Test via curl first:**
```bash
curl -X POST https://crm.curagenesis.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@curagenesis.com","password":"Money100!"}' \
  -v
```

**Expected response:** HTTP 200 with user data and auth token

**Then test in browser:**
1. Go to `https://crm.curagenesis.com/login`
2. Enter email: `admin@curagenesis.com`
3. Enter password: `Money100!`
4. Click "Sign In"

**Expected:** Redirect to `/dashboard`

---

### Step 6: Verify Full Functionality

Test key CRM features.

**Actions to test:**
1. ✅ Navigate to `/intake` - Practice intake form
2. ✅ Create a test practice account
3. ✅ Submit practice to CuraGenesis API
4. ✅ Check submission status
5. ✅ Navigate to `/dashboard` - KPI metrics
6. ✅ Navigate to `/mail` - Mail integration
7. ✅ Navigate to `/documents` - Document library
8. ✅ Navigate to `/admin` - Admin panel (if admin user)

**Expected:** All pages load and function correctly

---

## TROUBLESHOOTING

### If Database Init Fails

**Error:** "permission denied" or "cannot create table"

**Fix:**
```sql
GRANT ALL ON SCHEMA public TO curagen_crm_user;
GRANT ALL ON SCHEMA public TO PUBLIC;
```

Then retry the database-init.sql

---

### If Container Crashes

**Check logs for errors:**
```bash
aws logs tail /ecs/curagenesis-crm --since 30m --region us-east-1 | grep -i "error\|fail\|exception"
```

**Common issues:**
- Database connection string wrong (check DATABASE_URL env var)
- Missing environment variable
- Port 3000 conflict

---

### If Login Still Fails After Everything

**Verify admin user exists:**
```sql
SELECT id, email, name, role, 
       CASE WHEN password IS NOT NULL THEN 'HAS_PASSWORD' ELSE 'NO_PASSWORD' END as password_status
FROM users 
WHERE email = 'admin@curagenesis.com';
```

**If no results:** Admin user wasn't created. Check CloudWatch logs for "[ADMIN] Ensuring admin user exists" message.

**If user exists but no password:** Run the admin creation part of database-init.sql again.

---

## SUCCESS CRITERIA

**The deployment is successful when:**

1. ✅ Database has all tables (users, accounts, contacts, etc.)
2. ✅ Admin user exists in users table with password
3. ✅ ECS service shows runningCount: 1
4. ✅ CloudWatch logs show "Ready in XXXms"
5. ✅ Health endpoint returns `{"status":"ok"}`
6. ✅ Can login with admin@curagenesis.com / Money100!
7. ✅ Dashboard loads after login
8. ✅ All navigation works

---

## EXECUTION ORDER

**Execute in this exact order:**

1. **Database initialization** (Step 1) - Creates tables
2. **Pull latest image** (Step 2) - Gets emoji-free version
3. **Deploy to ECS** (Step 3) - Starts container
4. **Monitor logs** (Step 4) - Verify startup
5. **Test login** (Step 5) - Confirm working
6. **Verify features** (Step 6) - Full QA

**Do not skip steps or change order!**

---

## ESTIMATED TIMELINE

- Database init: 2 minutes
- Image pull/push: 3 minutes
- ECS deployment: 3 minutes
- Monitoring: 2 minutes
- Testing: 5 minutes

**Total: 15 minutes to fully operational CRM**

---

## FINAL NOTES FOR CURSOR AI

- Use AWS CLI for all operations
- Region is always us-east-1
- Account is 516267217490
- Be thorough and check each step completes before proceeding
- Report any errors immediately with full details
- Success is when admin login works and redirects to dashboard

**Execute all steps and report final status!**

