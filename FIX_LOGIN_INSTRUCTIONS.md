# Fix CRM Login - Step-by-Step Instructions

**Issue:** Login showing "Login Failed" error  
**Cause:** Startup script may not have run or admin user not created  
**Solution:** Verify logs and ensure startup script executes

---

## Step 1: Check CloudWatch Logs

### Go to CloudWatch
1. Login to AWS Console: `https://516267217490.signin.aws.amazon.com/console`
2. Navigate to: **CloudWatch** → **Log groups**
3. Find: `/ecs/curagenesis-crm`
4. Click on the **latest log stream**

### Look for These Messages
```
🚀 Starting CuraGenesis CRM...
📊 Running schema updates...
Adding primary_contact_name column...
Adding primary_contact_position column...
Creating Team enum type...
Adding team column to users...
✅ Schema updates complete
🌱 Ensuring admin user exists...
✅ Admin user exists
📧 Admin Email: admin@curagenesis.com
🔑 Admin Password: Money100!
✅ Initialization complete!
🌐 Starting Next.js server...
✓ Ready in XXXms
```

### What to Look For

**✅ If you see all those messages:**
- Startup script ran successfully
- Admin user was created
- Database tables exist
- Problem is something else (continue to Step 2)

**❌ If you DON'T see those messages:**
- Startup script didn't run
- Need to fix task definition (continue to Step 3)

---

## Step 2: Verify Admin User Exists (If Logs Look Good)

### Connect to Database
Use RDS Query Editor or psql:

```sql
-- Check if users table exists
SELECT tablename FROM pg_tables WHERE tablename = 'users';

-- Check if admin user exists
SELECT id, email, name, role FROM users WHERE email = 'admin@curagenesis.com';

-- If user exists, verify password column
SELECT id, email, name, role, 
       CASE WHEN password IS NOT NULL THEN 'HAS_PASSWORD' ELSE 'NO_PASSWORD' END as password_status
FROM users WHERE email = 'admin@curagenesis.com';
```

**If admin user exists with password:**
- The startup script ran correctly
- Issue might be JWT secret mismatch or other auth problem
- Check application logs for specific error

**If admin user doesn't exist or has no password:**
- Startup script didn't complete
- Continue to Step 3

---

## Step 3: Fix Task Definition (If Startup Script Didn't Run)

The task definition might be overriding the startup script. Let's use the FIXED version.

### Option A: Use Task Definition 26 (Latest)

Check current task definition:
```bash
aws ecs describe-services \
  --cluster curagenesis-cluster \
  --services curagenesis-crm \
  --region us-east-1 \
  --query 'services[0].taskDefinition'
```

**Should show:** `curagenesis-crm:26`

**If it shows a different revision**, update to 26:
```bash
aws ecs update-service \
  --cluster curagenesis-cluster \
  --service curagenesis-crm \
  --task-definition curagenesis-crm:26 \
  --force-new-deployment \
  --region us-east-1
```

### Option B: Register NEW Fixed Task Definition

If task definition 26 doesn't exist or has issues, use Alex's FIXED version:

```bash
# Upload production-task-definition-FIXED.json (provided by Alex)

aws ecs register-task-definition \
  --cli-input-json file://production-task-definition-FIXED.json \
  --region us-east-1

aws ecs update-service \
  --cluster curagenesis-cluster \
  --service curagenesis-crm \
  --task-definition curagenesis-crm \
  --force-new-deployment \
  --region us-east-1
```

---

## Step 4: Wait and Monitor

### Wait for Deployment (5 minutes)
```bash
aws ecs wait services-stable \
  --cluster curagenesis-cluster \
  --services curagenesis-crm \
  --region us-east-1
```

### Monitor Logs in Real-Time
Watch CloudWatch logs for the startup messages (see Step 1)

### Check Service Status
```bash
aws ecs describe-services \
  --cluster curagenesis-cluster \
  --services curagenesis-crm \
  --region us-east-1 \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'
```

**Expected:** Running = 1, Desired = 1

---

## Step 5: Test Login

### Once Logs Show Admin User Created

1. Go to: `https://crm.curagenesis.com/login`
2. Email: `admin@curagenesis.com`
3. Password: `Money100!`
4. Click "Sign In"

**Should redirect to:** `/dashboard`

---

## Troubleshooting

### If Login Still Fails After All Above

**Check for specific errors:**

1. **Open Browser DevTools** (F12)
2. **Go to Network tab**
3. **Try login again**
4. **Click on the `/api/auth/login` request**
5. **Look at Response tab**

**Common errors:**

**"Invalid credentials":**
- Admin user password is wrong
- Try creating a new user manually in database

**"Database connection failed":**
- DATABASE_URL env var is wrong
- RDS security group blocking ECS
- Database not running

**"Internal server error":**
- Check CloudWatch application logs
- Look for stack traces
- Check database connectivity

### Manual Admin User Creation (Last Resort)

If nothing else works, create admin manually:

```sql
-- Connect to database
-- Generate password hash (use Node.js crypto or online bcrypt)
-- For password "Money100!":

INSERT INTO users (id, email, name, password, role, active, onboard_status, created_at, updated_at)
VALUES (
  gen_random_uuid()::text,
  'admin@curagenesis.com',
  'Admin User',
  '$2b$10$YourBcryptHashHere',  -- Replace with actual bcrypt hash
  'ADMIN',
  true,
  'ACTIVE',
  NOW(),
  NOW()
);
```

---

## Quick Checklist

- [ ] CloudWatch logs show startup script ran
- [ ] CloudWatch logs show "Admin user exists"
- [ ] Database `users` table exists
- [ ] Admin user row exists in users table
- [ ] Admin user has hashed password
- [ ] Task definition uses correct image (no custom command override)
- [ ] ECS service running count = 1
- [ ] Load balancer target healthy
- [ ] Login page loads correctly
- [ ] Login attempt returns specific error (not just "failed")

---

## Expected Timeline

- **Check logs:** 2 minutes
- **Fix task definition if needed:** 3 minutes
- **Wait for deployment:** 5 minutes
- **Test login:** 1 minute

**Total:** 10-15 minutes to have login working

---

**The infrastructure is perfect. Just need the startup script to run correctly to create the admin user!**

