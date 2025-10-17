#!/bin/bash

# Migration Script: Move CRM from Account 337909762852 to Account 516267217490
# CuraGenesis Production Account Migration

set -e

echo "🚀 CuraGenesis CRM Migration Script"
echo "===================================="
echo "From: AWS Account 337909762852 (Dev)"
echo "To:   AWS Account 516267217490 (CuraGenesis Production)"
echo ""

# Configuration
SOURCE_ACCOUNT="337909762852"
TARGET_ACCOUNT="516267217490"
REGION="us-east-1"
ECR_REPO="curagenesis-crm"

# Read from user
read -p "Enter TARGET account ECR repository name (default: curagenesis-crm): " TARGET_ECR_REPO
TARGET_ECR_REPO=${TARGET_ECR_REPO:-curagenesis-crm}

read -p "Enter TARGET account RDS endpoint: " TARGET_DB_URL
read -p "Enter TARGET account ECS cluster name: " TARGET_CLUSTER
read -p "Enter TARGET account ECS service name: " TARGET_SERVICE

echo ""
echo "📦 Step 1: Export and Push Docker Image"
echo "========================================"

# Pull latest image from source account
echo "Pulling latest image from source account..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $SOURCE_ACCOUNT.dkr.ecr.$REGION.amazonaws.com
docker pull $SOURCE_ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:latest

# Tag for target account
echo "Tagging for target account..."
docker tag $SOURCE_ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:latest \
  $TARGET_ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$TARGET_ECR_REPO:latest

# Push to target account
echo "Pushing to target account ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $TARGET_ACCOUNT.dkr.ecr.$REGION.amazonaws.com
docker push $TARGET_ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$TARGET_ECR_REPO:latest

echo "✅ Docker image migrated"

echo ""
echo "📊 Step 2: Database Migration (Optional)"
echo "========================================"
echo "Current DB: Source account RDS"
echo "Target DB: $TARGET_DB_URL"
echo ""
echo "Options:"
echo "1. Use their existing database (tables already match)"
echo "2. Export and import data"
echo ""
read -p "Skip database migration and use their existing DB? (y/n): " SKIP_DB

if [ "$SKIP_DB" != "y" ]; then
  echo "Exporting data..."
  pg_dump "postgresql://curagen_intake_user:CuraGenCRM2024!@cura-genesis-crm-db.c6ds4c4qok1n.us-east-1.rds.amazonaws.com:5432/curagenesis_intake_crm" \
    --data-only --inserts > crm_data.sql
  
  echo "Importing to target database..."
  psql "$TARGET_DB_URL" < crm_data.sql
  
  echo "✅ Data migrated"
else
  echo "⏭️  Using existing database in target account"
fi

echo ""
echo "🔧 Step 3: Create Task Definition in Target Account"
echo "===================================================="

cat > task-definition-target.json <<EOF
{
  "family": "$TARGET_ECR_REPO",
  "taskRoleArn": "arn:aws:iam::$TARGET_ACCOUNT:role/ecsTaskExecutionRole",
  "executionRoleArn": "arn:aws:iam::$TARGET_ACCOUNT:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "$TARGET_ECR_REPO",
      "image": "$TARGET_ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$TARGET_ECR_REPO:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "$TARGET_DB_URL"
        },
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "JWT_SECRET",
          "value": "cura-genesis-crm-jwt-secret-2024-secure-key"
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
          "value": "https://curagenesiscrm.com"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/$TARGET_ECR_REPO",
          "awslogs-region": "$REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

echo "Registering task definition in target account..."
aws ecs register-task-definition \
  --cli-input-json file://task-definition-target.json \
  --region $REGION

echo "✅ Task definition created"

echo ""
echo "🚀 Step 4: Update or Create ECS Service"
echo "========================================"

# Check if service exists
SERVICE_EXISTS=$(aws ecs describe-services \
  --cluster $TARGET_CLUSTER \
  --services $TARGET_SERVICE \
  --region $REGION \
  --query 'services[0].status' \
  --output text 2>/dev/null || echo "MISSING")

if [ "$SERVICE_EXISTS" = "ACTIVE" ]; then
  echo "Service exists, updating..."
  aws ecs update-service \
    --cluster $TARGET_CLUSTER \
    --service $TARGET_SERVICE \
    --force-new-deployment \
    --region $REGION
else
  echo "Service doesn't exist. Create it manually in ECS console or provide service creation parameters."
  echo "Use task definition: $TARGET_ECR_REPO"
fi

echo ""
echo "✅ Migration Complete!"
echo "====================="
echo ""
echo "Next Steps:"
echo "1. Verify service is running in target account"
echo "2. Update DNS to point to new load balancer (if needed)"
echo "3. Test all functionality"
echo "4. Update CURAGENESIS_API_BASE to use their API Gateway"
echo ""
echo "🎉 CRM is now in CuraGenesis production account!"

