# AWS Credentials for CRM Migration

**Date:** October 17, 2025  
**Purpose:** Provide CuraGenesis team access to pull CRM resources from dev account  
**Account:** 337909762852 (Alex's Development Account)

---

## 🔑 CREDENTIALS NEEDED

The CuraGenesis team needs **read-only access** to pull:
- Docker image from ECR
- (Optional) Database export from RDS

---

## 📋 OPTION 1: Create IAM User (Recommended)

**Alex to do in AWS Console:**

### Step 1: Create IAM User
1. Go to IAM Console in account 337909762852
2. Click "Users" → "Create user"
3. User name: `curagenesis-migration-readonly`
4. Select: "Programmatic access" only
5. Click "Next"

### Step 2: Attach Policies
Attach these policies:
- ✅ `AmazonEC2ContainerRegistryReadOnly` (pull Docker images)
- ✅ `AmazonRDSReadOnlyAccess` (optional - for DB export)

Or create custom policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:DescribeImages",
        "ecr:DescribeRepositories",
        "ecr:ListImages"
      ],
      "Resource": "*"
    }
  ]
}
```

### Step 3: Get Credentials
After creating user:
1. Download the CSV with credentials, OR
2. Copy the Access Key ID and Secret Access Key

### Step 4: Share with CuraGenesis Team
**Send via secure channel (Slack DM, 1Password, etc.):**

```
AWS Account: 337909762852
Region: us-east-1
ECR Repository: curagenesis-crm

Access Key ID: AKIA... (20 characters)
Secret Access Key: .... (40 characters)

Valid for: Migration only (revoke after)
Permissions: ECR Read-Only
```

---

## 📋 OPTION 2: Use Your Existing Credentials

**If you have AWS CLI configured:**

```bash
# Check current credentials
aws sts get-caller-identity

# Should show:
# Account: 337909762852
# UserId: ...
# Arn: arn:aws:iam::337909762852:user/YOUR_USERNAME
```

**Share these with CuraGenesis team:**
1. Run: `cat ~/.aws/credentials`
2. Find the profile for account 337909762852
3. Copy Access Key ID and Secret Access Key
4. Send via secure channel

---

## 🔒 SECURITY BEST PRACTICES

### DO:
- ✅ Create a separate IAM user for migration (not your personal account)
- ✅ Give minimum permissions (ECR read-only)
- ✅ Set expiration/revoke after migration completes
- ✅ Share via secure channel (not email)
- ✅ Delete user after migration

### DON'T:
- ❌ Share your personal AWS credentials
- ❌ Give admin access (not needed)
- ❌ Send via email or Slack public channels
- ❌ Leave credentials active after migration

---

## 📊 WHAT THEY'LL DO WITH CREDENTIALS

```bash
# 1. Configure AWS CLI
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...

# 2. Pull Docker image
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 337909762852.dkr.ecr.us-east-1.amazonaws.com

docker pull 337909762852.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest

# 3. Tag and push to their account
docker tag 337909762852.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest \
  516267217490.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest

docker push 516267217490.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest
```

**After this, they no longer need the credentials** and you can revoke/delete the IAM user.

---

## ⚡ EVEN EASIER OPTION

**If Alex has AWS CLI configured locally:**

Alex can just run the migration script himself:

```bash
# From Alex's machine (already authenticated to account 337909762852)
./migrate-to-cg-account.sh

# It will prompt for:
# - CuraGenesis team's ECR repo name
# - Their RDS endpoint
# - Their ECS cluster name
# - Their service name

# Script will:
# 1. Pull image from dev account (using Alex's creds)
# 2. Push to prod account (if Alex has cross-account push permission)
# 3. Update configuration
# 4. Deploy

# Total time: 5 minutes
```

---

## 🎯 RECOMMENDED APPROACH

**Easiest path:**

1. **CuraGenesis team creates:**
   - ECR repository: `curagenesis-crm` in account 516267217490
   - Grants Alex's IAM user push permission to this repo
   
2. **Alex runs:**
   ```bash
   ./migrate-to-cg-account.sh
   ```
   
3. **Done!** CRM is migrated

**Alternative if no cross-account push:**

1. **Alex creates temp IAM user** with ECR read-only
2. **Shares credentials** with CuraGenesis team (via 1Password)
3. **CuraGenesis team pulls** Docker image
4. **Alex revokes credentials** after pull completes
5. **CuraGenesis team deploys** in their account

---

## 📞 NEXT STEPS

**Alex:**
1. Decide which approach to use
2. Create IAM user if needed (5 minutes)
3. Share credentials securely
4. Coordinate with CuraGenesis team

**CuraGenesis Team:**
1. Prepare ECR repository
2. Prepare ECS cluster/service
3. Have RDS endpoint ready
4. Pull Docker image
5. Deploy to ECS
6. Test

**Timeline:** 20-30 minutes total from start to finish

---

**Let's coordinate a time to execute this together!**

