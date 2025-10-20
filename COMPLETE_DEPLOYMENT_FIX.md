# CuraGenesis CRM - Complete Deployment Fix

**Date:** October 19, 2025  
**Status:** Docker image pushed to ECR, ready to deploy  
**Goal:** Get CRM fully operational at https://crm.curagenesis.com

---

## 🎯 EXECUTIVE SUMMARY

**What's Ready:**
- ✅ Docker image pushed to your ECR (516267217490)
- ✅ Image is correct architecture (linux/amd64)
- ✅ All bug fixes included
- ✅ Infrastructure exists (ECS, RDS, ALB, DNS)

**What's Needed:**
- Deploy with correct task definition
- Let startup script create database tables
- Admin user will auto-create
- Login will work

**Time to Complete:** 10 minutes

---

## 📋 STEP-BY-STEP FIX

### Step 1: Clear Database (Nuclear Option - Fresh Start)

**Connect to RDS and wipe everything:**

```bash
# Using AWS CLI
aws rds-data execute-statement \
  --resource-arn "arn:aws:rds:us-east-1:516267217490:cluster:curagenesis-crm-db" \
  --database "curagenesis_crm" \
  --sql "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO curagen_crm_user; GRANT ALL ON SCHEMA public TO PUBLIC;" \
  --region us-east-1
```

**Or use RDS Query Editor in Console:**
1. Go to RDS → Query Editor
2. Connect to `curagenesis-crm-db`
3. Run:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO curagen_crm_user;
GRANT ALL ON SCHEMA public TO PUBLIC;
```

**Why:** Clears any partial/broken tables and failed migrations. Fresh slate.

---

### Step 2: Create the Correct Task Definition

**Save this as `task-definition-final.json`:**

```json
{
  "family": "curagenesis-crm",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::516267217490:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::516267217490:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "curagenesis-crm",
      "image": "516267217490.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "postgresql://curagen_crm_user:CuraGenCRM2024!@curagenesis-crm-db.corg4gc86qjy.us-east-1.rds.amazonaws.com:5432/curagenesis_crm"
        },
        {
          "name": "JWT_SECRET",
          "value": "cura-genesis-crm-jwt-secret-2024-secure-key"
        },
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "CURAGENESIS_API_BASE",
          "value": "https://w6mxt54h5f.execute-api.us-east-2.amazonaws.com/Prod"
        },
        {
          "name": "CURAGENESIS_API_KEY",
          "value": "DDi4EEcXyx1q6UcQc4ezX6mlhaoNo7Lo9q7SO1en"
        },
        {
          "name": "CURAGENESIS_VENDOR_TOKEN",
          "value": "Nb9sQCZnrAxAxS4KrysMLzRUQ2HN21hbZmpshgZYb1cT7sEPdJkNEE_MhfB59pDt"
        },
        {
          "name": "CURAGENESIS_API_TIMEOUT_MS",
          "value": "60000"
        },
        {
          "name": "WORKMAIL_ORG_ID",
          "value": "m-54c0d88df2b64c73931b40710553ad5f"
        },
        {
          "name": "NEXT_PUBLIC_WORKMAIL_WEB_URL",
          "value": "https://curagenesis.awsapps.com/mail"
        },
        {
          "name": "AWS_REGION_WORKMAIL",
          "value": "us-east-1"
        },
        {
          "name": "AWS_REGION_SES",
          "value": "us-east-2"
        },
        {
          "name": "CRM_BASE_URL",
          "value": "https://crm.curagenesis.com"
        },
        {
          "name": "NEXT_PUBLIC_APP_URL",
          "value": "https://crm.curagenesis.com"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-create-group": "true",
          "awslogs-group": "/ecs/curagenesis-crm",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

**CRITICAL:** Notice there is NO `"command"` field. This is intentional. The Docker image's default CMD will run, which executes `/bin/bash scripts/startup.sh`.

---

### Step 3: Delete ALL Existing Task Definitions (Nuclear Cache Clear)

**Stop the service first:**
```bash
aws ecs update-service \
  --cluster curagenesis-cluster \
  --service curagenesis-crm \
  --desired-count 0 \
  --region us-east-1
```

**Wait for it to stop:**
```bash
aws ecs wait services-inactive \
  --cluster curagenesis-cluster \
  --services curagenesis-crm \
  --region us-east-1
```

**Deregister ALL old task definitions (clears cache):**
```bash
# List all revisions
aws ecs list-task-definitions --family-prefix curagenesis-crm --region us-east-1 --query 'taskDefinitionArns[]' --output text

# Deregister each one (replace XX with actual revision numbers)
for i in {1..31}; do
  aws ecs deregister-task-definition \
    --task-definition curagenesis-crm:$i \
    --region us-east-1 2>/dev/null || true
done
```

---

### Step 4: Register Fresh Task Definition

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition-final.json \
  --region us-east-1
```

**Verify it registered:**
```bash
aws ecs describe-task-definition \
  --task-definition curagenesis-crm \
  --region us-east-1 \
  --query 'taskDefinition.{Revision:revision,Image:containerDefinitions[0].image,Command:containerDefinitions[0].command}'
```

**Expected output:**
```json
{
  "Revision": 32,
  "Image": "516267217490.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest",
  "Command": null
}
```

**If Command is not null, the task definition is wrong!**

---

### Step 5: Update Service with Fresh Deployment

```bash
# Start service with new task definition
aws ecs update-service \
  --cluster curagenesis-cluster \
  --service curagenesis-crm \
  --task-definition curagenesis-crm \
  --desired-count 1 \
  --force-new-deployment \
  --region us-east-1
```

---

### Step 6: Monitor Deployment

**Watch service stabilize:**
```bash
aws ecs wait services-stable \
  --cluster curagenesis-cluster \
  --services curagenesis-crm \
  --region us-east-1
```

**Watch logs in real-time:**
```bash
# Get latest task ID
TASK_ID=$(aws ecs list-tasks --cluster curagenesis-cluster --service-name curagenesis-crm --region us-east-1 --query 'taskArns[0]' --output text | awk -F/ '{print $NF}')

# Tail logs
aws logs tail /ecs/curagenesis-crm --follow --region us-east-1 --format short
```

**Look for these CRITICAL lines:**
```
🚀 Starting CuraGenesis CRM...
📊 Running schema updates...
Adding primary_contact_name column...
✅ Schema updates complete
🌱 Ensuring admin user exists...
✅ Admin user exists
📧 Admin Email: admin@curagenesis.com
🔑 Admin Password: Money100!
✅ Initialization complete!
🌐 Starting Next.js server...
▲ Next.js 14.2.13
✓ Ready in XXXms
```

**If you see those lines, the CRM is working!**

---

### Step 7: Test Login

**Once logs show "Ready in XXXms":**

1. Go to: `https://crm.curagenesis.com/login`
2. Email: `admin@curagenesis.com`
3. Password: `Money100!`
4. Click "Sign In"

**Should redirect to:** `/dashboard`

---

## 🔥 NUCLEAR CACHE CLEARING (If Still Having Issues)

### Clear Docker Cache on Your Machine

```bash
# Stop all containers
docker stop $(docker ps -aq)

# Remove all containers
docker rm $(docker ps -aq)

# Remove all images
docker rmi -f $(docker images -aq)

# Prune everything
docker system prune -af --volumes

# Remove buildx cache
rm -rf ~/.docker/buildx

# Restart Docker Desktop
# (Use Docker Desktop UI: Quit Docker Desktop, then restart)
```

### Clear AWS ECS Cache

```bash
# Stop service
aws ecs update-service --cluster curagenesis-cluster --service curagenesis-crm --desired-count 0 --region us-east-1

# Delete service entirely
aws ecs delete-service --cluster curagenesis-cluster --service curagenesis-crm --force --region us-east-1

# Wait a minute for deletion
sleep 60

# Recreate service
aws ecs create-service \
  --cluster curagenesis-cluster \
  --service-name curagenesis-crm \
  --task-definition curagenesis-crm \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[YOUR_SUBNET_IDS],securityGroups=[YOUR_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:516267217490:targetgroup/curagenesis-crm-tg/0044841a59adba29,containerName=curagenesis-crm,containerPort=3000 \
  --region us-east-1
```

**Replace YOUR_SUBNET_IDS and YOUR_SG_ID with actual values from existing service.**

---

## 🎯 THE ABSOLUTE SIMPLEST FIX

**If all else fails, just do this:**

### 1. Stop Current Service
```bash
aws ecs delete-service --cluster curagenesis-cluster --service curagenesis-crm --force --region us-east-1
```

### 2. Wait 1 Minute
```bash
sleep 60
```

### 3. Use ECS Console to Create Service
1. Go to ECS Console
2. Click "Create Service"
3. Select cluster: `curagenesis-cluster`
4. Launch type: Fargate
5. Task definition: `curagenesis-crm` (latest)
6. Service name: `curagenesis-crm`
7. Desired tasks: 1
8. VPC: (use existing)
9. Subnets: (use existing)
10. Security group: (use existing)
11. Load balancer: Application Load Balancer
12. Target group: `curagenesis-crm-tg`
13. **Health check grace period: 300 seconds**
14. Create

### 4. Wait 5 Minutes

The service will:
- Pull image from ECR
- Start container
- Run startup.sh
- Create database tables
- Create admin user
- Start Next.js

### 5. Test

Login at `https://crm.curagenesis.com/login`

---

## ✅ CHECKLIST FOR SUCCESS

Before deploying:
- [ ] Database schema dropped (fresh start)
- [ ] Task definition has NO "command" field
- [ ] Task definition uses image: `516267217490.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest`
- [ ] All env vars present (DATABASE_URL, JWT_SECRET, etc.)
- [ ] Log group exists: `/ecs/curagenesis-crm`

During deployment:
- [ ] Service shows desiredCount: 1
- [ ] Task starts (not immediately crashing)
- [ ] Logs show "Starting CuraGenesis CRM..."
- [ ] Logs show "Schema updates complete"
- [ ] Logs show "Admin user exists"
- [ ] Logs show "Ready in XXXms"

After deployment:
- [ ] Service shows runningCount: 1
- [ ] Health checks passing (2/2 healthy)
- [ ] https://crm.curagenesis.com returns 200 or 307
- [ ] Login page loads
- [ ] Admin login works

---

## 🔥 IF NOTHING WORKS - ULTRA NUCLEAR OPTION

### Delete EVERYTHING and Start Fresh

```bash
# 1. Delete service
aws ecs delete-service --cluster curagenesis-cluster --service curagenesis-crm --force --region us-east-1

# 2. Delete all task definitions
for i in {1..50}; do
  aws ecs deregister-task-definition --task-definition curagenesis-crm:$i --region us-east-1 2>/dev/null || true
done

# 3. Delete cluster
aws ecs delete-cluster --cluster curagenesis-cluster --region us-east-1

# 4. Wipe database
# (Run DROP SCHEMA command from Step 1)

# 5. Wait 2 minutes
sleep 120

# 6. Create everything fresh
aws ecs create-cluster --cluster-name curagenesis-cluster --region us-east-1

aws ecs register-task-definition --cli-input-json file://task-definition-final.json --region us-east-1

# 7. Create service (use Console - easier to get subnets/SGs right)
# Go to ECS Console and create service with UI
```

---

## 📞 SUPPORT COMMANDS

### Get Current Service Info
```bash
aws ecs describe-services \
  --cluster curagenesis-cluster \
  --services curagenesis-crm \
  --region us-east-1 \
  --query 'services[0]'
```

### Get Running Task Details
```bash
TASK=$(aws ecs list-tasks --cluster curagenesis-cluster --service-name curagenesis-crm --region us-east-1 --query 'taskArns[0]' --output text)

aws ecs describe-tasks \
  --cluster curagenesis-cluster \
  --tasks $TASK \
  --region us-east-1
```

### Get Recent Logs
```bash
aws logs tail /ecs/curagenesis-crm --since 30m --region us-east-1
```

### Check Image in ECR
```bash
aws ecr describe-images \
  --repository-name curagenesis-crm \
  --region us-east-1 \
  --query 'imageDetails[0]'
```

---

## 🎯 THE ONE COMMAND THAT SHOULD FIX EVERYTHING

**If you just want to try one thing:**

```bash
# Stop service, wait, restart with fresh task
aws ecs update-service --cluster curagenesis-cluster --service curagenesis-crm --desired-count 0 --region us-east-1 && \
sleep 30 && \
aws ecs register-task-definition --cli-input-json file://task-definition-final.json --region us-east-1 && \
aws ecs update-service --cluster curagenesis-cluster --service curagenesis-crm --task-definition curagenesis-crm --desired-count 1 --force-new-deployment --region us-east-1 && \
echo "Waiting for deployment..." && \
aws ecs wait services-stable --cluster curagenesis-cluster --services curagenesis-crm --region us-east-1 && \
echo "✅ Deployment complete! Check https://crm.curagenesis.com"
```

---

## 🎉 EXPECTED SUCCESS

**When it's working, you'll see:**

### CloudWatch Logs:
```
🚀 Starting CuraGenesis CRM...
✅ Schema updates complete
✅ Admin user exists
📧 Admin Email: admin@curagenesis.com
🔑 Admin Password: Money100!
✓ Ready in 197ms
```

### ECS Service:
- runningCount: 1
- desiredCount: 1
- Status: ACTIVE

### Load Balancer:
- Healthy targets: 1/1

### CRM Website:
- https://crm.curagenesis.com → Login page
- Login with admin@curagenesis.com / Money100!
- Redirects to dashboard

---

## 📋 FINAL CHECKLIST

**Before saying "it's working":**

- [ ] Can access https://crm.curagenesis.com
- [ ] Login page loads
- [ ] Can login with admin credentials
- [ ] Dashboard loads after login
- [ ] Can navigate to /intake page
- [ ] Can create a practice account
- [ ] Can submit practice to CuraGenesis API
- [ ] Submission returns HTTP 200 SUCCESS

**Once all checkboxes are ✅, the CRM is fully operational!**

---

**KEY INSIGHT:** The Docker image is correct and ready. The issue is likely task definition caching or custom commands overriding the startup script. Use the task definition above with NO custom command field, nuke the cache, and deploy fresh.

**GOOD LUCK! YOU GOT THIS!** 🚀

