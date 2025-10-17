# CuraGenesis CRM - Migration to Production Account

**Date:** October 17, 2025  
**From:** Development Account (337909762852)  
**To:** CuraGenesis Production Account (516267217490)

---

## 🎯 WHAT IS THE CRM?

The **CuraGenesis CRM** is a lightweight **sales intake tool** for field reps. It:
- ✅ Captures practice information during sales calls
- ✅ Submits practices to your API for onboarding
- ✅ Displays KPIs pulled from your DynamoDB
- ✅ Tracks rep activity and submissions

**Important:** The CRM is NOT the source of truth. It's just a **frontend for your existing backend systems.**

---

## 💡 WHY MIGRATION IS EASY

### You Already Have Everything

**Your DynamoDB** already contains:
- All practice data (pulled via Partner API)
- All order data
- All metrics and KPIs
- All practice statuses

**Your API Gateway** already has:
- Practice submission endpoint (or can add one)
- Partner API for fetching data
- Authentication

**Your Infrastructure** already has:
- RDS for user management
- SES for emails
- WorkMail for corporate emails
- IAM roles and permissions

**The CRM just needs to:**
- Read from your DynamoDB (already doing this)
- Write to your API (already doing this)
- Run as a web app in your ECS

**That's it!** No data migration needed - you already own the data.

---

## 🚀 SIMPLE MIGRATION PLAN

### Phase 1: Push Docker Image (5 minutes)

```bash
# 1. Get the Docker image
docker pull 337909762852.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest

# 2. Login to your ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 516267217490.dkr.ecr.us-east-1.amazonaws.com

# 3. Tag for your account
docker tag 337909762852.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest \
  516267217490.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest

# 4. Push to your ECR
docker push 516267217490.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest
```

✅ **Result:** Docker image now in your account

### Phase 2: Configure Environment (2 minutes)

**Create ECS Task Definition with these env vars:**

```json
{
  "DATABASE_URL": "postgresql://YOUR_RDS_ENDPOINT/curagenesis_crm",
  "JWT_SECRET": "your-secure-jwt-secret",
  "NODE_ENV": "production",
  
  "CURAGENESIS_API_BASE": "https://w6mxt54h5f.execute-api.us-east-2.amazonaws.com/Prod",
  "CURAGENESIS_API_KEY": "your-api-key",
  "CURAGENESIS_VENDOR_TOKEN": "Nb9sQCZnrAxAxS4KrysMLzRUQ2HN21hbZmpshgZYb1cT7sEPdJkNEE_MhfB59pDt",
  "CURAGENESIS_API_TIMEOUT_MS": "60000",
  
  "CG_METRICS_API_KEY": "your-metrics-key",
  "NEXT_PUBLIC_CG_METRICS_BASE": "https://w6mxt54h5f.execute-api.us-east-2.amazonaws.com/Prod",
  
  "WORKMAIL_ORG_ID": "m-54c0d88df2b64c73931b40710553ad5f",
  "NEXT_PUBLIC_WORKMAIL_WEB_URL": "https://curagenesis.awsapps.com/mail",
  "AWS_REGION_WORKMAIL": "us-east-1",
  "AWS_REGION_SES": "us-east-2",
  
  "CRM_BASE_URL": "https://crm.curagenesis.com",
  "NEXT_PUBLIC_APP_URL": "https://crm.curagenesis.com"
}
```

**Note:** Just point to YOUR existing APIs and databases. No duplication needed.

### Phase 3: Deploy to ECS (3 minutes)

```bash
# Register task definition (use JSON above)
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region us-east-1

# Create or update service
aws ecs create-service \
  --cluster YOUR_CLUSTER \
  --service-name curagenesis-crm \
  --task-definition curagenesis-crm \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[YOUR_SUBNETS],securityGroups=[YOUR_SG],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=YOUR_TG_ARN,containerName=curagenesis-crm,containerPort=3000 \
  --region us-east-1
```

✅ **Result:** CRM running in your account

### Phase 4: Update DNS (1 minute)

```bash
# Point crm.curagenesis.com to your Application Load Balancer
# (Update Route53 A record to point to your ALB)
```

✅ **Result:** CRM accessible at your domain

---

## 📊 WHAT STAYS THE SAME

### No Changes Needed For:
- ✅ Your DynamoDB (CRM already reads from it)
- ✅ Your Partner API (CRM already calls it)
- ✅ Your practice data (you own it)
- ✅ Your authentication (CRM will use it)
- ✅ Your Lambda functions (CRM will call them)

### Only Change:
- ✅ CRM app now runs in YOUR ECS (instead of dev account)
- ✅ CRM users stored in YOUR RDS (instead of dev RDS)

---

## 🔑 KEY INSIGHT

**The CRM doesn't own any critical data!**

Everything important is already in your account:
- Practices → Your DynamoDB
- Orders → Your DynamoDB
- Metrics → Your DynamoDB
- Practice onboarding → Your portal
- Magic links → Your Lambda creates them

**The CRM is just a UI layer** for your sales reps to:
- Input new practices
- View their metrics
- Track their pipeline

**Moving it to your account just makes it officially "yours" instead of in a dev sandbox.**

---

## ⏱️ ACTUAL TIMELINE

**If your infrastructure exists:**
- Docker image migration: **5 minutes**
- Environment configuration: **2 minutes**
- ECS deployment: **3 minutes**
- DNS update: **1 minute**
- Testing: **5 minutes**

**Total: ~15 minutes of actual work**

**If we need to create infrastructure:**
- Create ECS cluster: **2 minutes** (one command)
- Create target group: **2 minutes**
- Update ALB: **1 minute**
- Everything else same as above

**Total: ~20 minutes**

---

## 🎯 DECISION POINTS

### Option A: Migrate Now (Recommended)
**Pros:**
- Everything in one account
- Your team has full control
- Cleaner architecture
- Direct API calls (faster)
- Better security boundary

**Cons:**
- 20 minutes of coordination time

### Option B: Stay in Dev Account
**Pros:**
- No work required
- Keep working as-is

**Cons:**
- Cross-account complexity
- Confusion about which Lambda to update
- Split billing/management
- Not ideal for production

---

## ✅ RECOMMENDATION

**Migrate now (Option A).** It's only 20 minutes and eliminates all the confusion we've had today about which account/Lambda to update.

Plus, you probably want the CRM officially in YOUR account for:
- Security compliance
- Cost tracking
- Team access control
- Production support

---

## 📋 WHAT WE NEED FROM YOU

To execute the migration:

1. **Access:**
   - ECR repository name in your account (or create one: `curagenesis-crm`)
   - ECS cluster name (or create one: `curagenesis-cluster`)
   - RDS endpoint for CRM users table
   - VPC subnets and security groups
   - Target group ARN for load balancing

2. **Confirmation:**
   - Approve the environment variables above
   - Confirm database schema matches (we can run startup.sh to create tables)
   - Approve domain name (crm.curagenesis.com or keep curagenesiscrm.com)

3. **Time:**
   - 20-30 minute window for deployment and testing
   - Availability to test after deployment

---

## 🚀 READY WHEN YOU ARE

The CRM is fully functional and ready to move. Just say when and we'll execute the migration script.

**Benefits:**
- ✅ All in one account
- ✅ Direct access to your APIs
- ✅ Your team can maintain it
- ✅ Cleaner architecture
- ✅ No more cross-account confusion

Let us know and we'll migrate in 20 minutes! 🎉

