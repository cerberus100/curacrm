# CuraGenesis CRM - Final Deployment Instructions

**Issue:** Startup script fails because database tables don't exist yet  
**Solution:** Initialize database first, then deploy CRM  
**Time:** 10 minutes total

---

## 🎯 THE PROBLEM

Your startup script tries to modify tables that don't exist:
```
Adding primary_contact_name column...
ERROR: relation "accounts" does not exist
```

The script assumes Prisma already created base tables, but the database is empty.

---

## ✅ THE SOLUTION (2 Steps)

### Step 1: Initialize Database (5 minutes)

**Using AWS RDS Query Editor (Easiest):**

1. **Go to AWS Console** → **RDS** → **Query Editor**
2. **Click** "Connect to database"
3. **Select:**
   - Database: `curagenesis-crm-db`
   - Database name: `curagenesis_crm`
   - User: `curagen_crm_user`
   - Password: `CuraGenCRM2024!`
4. **Click** "Connect"
5. **Copy and paste** the entire contents of `database-init.sql` (provided by Alex)
6. **Click** "Run"
7. **Wait** ~30 seconds for all tables to create
8. **Verify** - You should see output showing all tables created

**Alternative - Using psql:**
```bash
psql "postgresql://curagen_crm_user:CuraGenCRM2024!@curagenesis-crm-db.corg4gc86qjy.us-east-1.rds.amazonaws.com:5432/curagenesis_crm" < database-init.sql
```

**Alternative - Using DataGrip/DBeaver/pgAdmin:**
- Connect to the RDS database
- Run the `database-init.sql` script

---

### Step 2: Deploy CRM (5 minutes)

**Now that tables exist, deploy the CRM:**

```bash
# Force new deployment (container will restart and startup script will succeed)
aws ecs update-service \
  --cluster curagenesis-cluster \
  --service curagenesis-crm \
  --force-new-deployment \
  --region us-east-1

# Wait for deployment
aws ecs wait services-stable \
  --cluster curagenesis-cluster \
  --services curagenesis-crm \
  --region us-east-1

echo "✅ Deployment complete! Check logs..."
```

**Monitor the logs:**
```bash
aws logs tail /ecs/curagenesis-crm --follow --region us-east-1
```

**You should now see:**
```
🚀 Starting CuraGenesis CRM...
📊 Running schema updates...
Adding primary_contact_name column...  ✅ (now works!)
Adding primary_contact_position column...  ✅ (now works!)
✅ Schema updates complete
🌱 Ensuring admin user exists...
✅ Admin user exists
📧 Admin Email: admin@curagenesis.com
🔑 Admin Password: Money100!
✅ Initialization complete!
🌐 Starting Next.js server...
✓ Ready in 197ms
```

---

## 🧪 TESTING

### Test 1: Health Check
```bash
curl https://crm.curagenesis.com/api/health
```

**Expected:**
```json
{"status":"ok","timestamp":"2025-10-19T..."}
```

### Test 2: Login Page
```bash
curl -I https://crm.curagenesis.com/login
```

**Expected:** `HTTP/2 200`

### Test 3: Admin Login
1. Go to: `https://crm.curagenesis.com/login`
2. Email: `admin@curagenesis.com`
3. Password: `Money100!`
4. Click "Sign In"

**Expected:** Redirect to `/dashboard`

---

## 📋 COMPLETE CHECKLIST

### Before Running Init Script:
- [ ] Have database-init.sql file ready
- [ ] Can access RDS (Query Editor or psql)
- [ ] Database is empty or ready to be reset

### Running Init Script:
- [ ] Connect to database successfully
- [ ] Run database-init.sql
- [ ] See success messages for all CREATE TABLE commands
- [ ] Verify tables exist: `SELECT tablename FROM pg_tables WHERE schemaname = 'public';`

### After Init Script:
- [ ] Force ECS deployment
- [ ] Monitor CloudWatch logs
- [ ] See "Schema updates complete" message
- [ ] See "Admin user exists" message
- [ ] See "Ready in XXXms" message

### Testing:
- [ ] Health endpoint returns OK
- [ ] Login page loads (HTTP 200)
- [ ] Can login with admin credentials
- [ ] Dashboard loads after login
- [ ] Can navigate to other pages

---

## 🚨 TROUBLESHOOTING

### If Init Script Fails

**Error: "relation already exists"**
- Tables already exist, skip the failing CREATE TABLE
- Or drop them first: `DROP TABLE tablename CASCADE;`

**Error: "permission denied"**
- User doesn't have CREATE permissions
- Run: `GRANT ALL ON SCHEMA public TO curagen_crm_user;`

**Error: "connection refused"**
- Security group blocking access
- Check RDS security group allows connections

### If Container Still Crashes

**Check logs for specific error:**
```bash
aws logs tail /ecs/curagenesis-crm --since 10m --region us-east-1 | grep -i "error\|fail\|exception"
```

**Common issues:**
- Database connection string wrong
- Missing environment variable
- Port 3000 already in use
- File permissions in container

### If Login Still Fails

**Verify admin user exists:**
```sql
SELECT id, email, name, role FROM users WHERE email = 'admin@curagenesis.com';
```

**Verify password is set:**
```sql
SELECT 
  id, 
  email, 
  CASE WHEN password IS NOT NULL THEN 'HAS_PASSWORD' ELSE 'NO_PASSWORD' END as password_status
FROM users 
WHERE email = 'admin@curagenesis.com';
```

**If no password:**
The startup script didn't create the admin user properly. Check logs for errors.

---

## 📁 FILES PROVIDED BY ALEX

1. **database-init.sql** - Run this in RDS first
2. **production-task-definition-FIXED.json** - Use this for ECS
3. **COMPLETE_DEPLOYMENT_FIX.md** - This file
4. **Docker image** - Already in your ECR

---

## ⚡ QUICK START (TL;DR)

```bash
# 1. Run init script in database (use RDS Query Editor or psql)
# database-init.sql creates all tables

# 2. Restart CRM
aws ecs update-service --cluster curagenesis-cluster --service curagenesis-crm --force-new-deployment --region us-east-1

# 3. Wait 5 minutes
aws ecs wait services-stable --cluster curagenesis-cluster --services curagenesis-crm --region us-east-1

# 4. Test login
# https://crm.curagenesis.com/login
# admin@curagenesis.com / Money100!

# 5. Done!
```

---

## 🎉 SUCCESS CRITERIA

**The CRM is working when:**
- ✅ `https://crm.curagenesis.com/api/health` returns `{"status":"ok"}`
- ✅ Login page loads without errors
- ✅ Can login with `admin@curagenesis.com` / `Money100!`
- ✅ Dashboard loads and shows data
- ✅ Can create and submit practices
- ✅ All features functional

**Current Status:** 95% there - just need to run the init script!

---

## 🚀 ESTIMATED TIMELINE

- **Database init:** 2 minutes (copy/paste SQL, click Run)
- **ECS deployment:** 3 minutes (one command)
- **Wait for container:** 3 minutes (auto-start)
- **Test login:** 1 minute

**Total: 10 minutes to fully operational CRM!**

---

**YOU'RE AT THE FINISH LINE! Just run the database init script and restart the service!** 🏁

