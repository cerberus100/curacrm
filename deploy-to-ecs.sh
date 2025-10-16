#!/bin/bash

# CuraGenesis CRM - ECS Deployment Script
# Deploys latest code to AWS ECS Fargate

set -e  # Exit on error

echo "🚀 Starting ECS Deployment..."
echo "================================"

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="337909762852"
ECR_REPO="curagenesis-crm"
ECS_CLUSTER="curagenesis-cluster"
ECS_SERVICE="curagenesis-crm-service-v2"
IMAGE_TAG="latest"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Building Docker Image (linux/amd64)...${NC}"
docker buildx build --platform linux/amd64 -t ${ECR_REPO}:${IMAGE_TAG} --load .

echo -e "${GREEN}✓ Docker image built successfully${NC}"
echo ""

echo -e "${BLUE}Step 2: Logging into AWS ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

echo -e "${GREEN}✓ Logged into ECR${NC}"
echo ""

echo -e "${BLUE}Step 3: Tagging Docker Image...${NC}"
docker tag ${ECR_REPO}:${IMAGE_TAG} ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${IMAGE_TAG}

echo -e "${GREEN}✓ Image tagged${NC}"
echo ""

echo -e "${BLUE}Step 4: Pushing to ECR...${NC}"
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${IMAGE_TAG}

echo -e "${GREEN}✓ Image pushed to ECR${NC}"
echo ""

echo -e "${BLUE}Step 5: Updating ECS Service (Force New Deployment)...${NC}"
aws ecs update-service \
  --cluster ${ECS_CLUSTER} \
  --service ${ECS_SERVICE} \
  --force-new-deployment \
  --region ${AWS_REGION} \
  --output json > /dev/null

echo -e "${GREEN}✓ ECS service updated${NC}"
echo ""

echo -e "${YELLOW}⏳ Waiting for deployment to stabilize...${NC}"
aws ecs wait services-stable \
  --cluster ${ECS_CLUSTER} \
  --services ${ECS_SERVICE} \
  --region ${AWS_REGION}

echo ""
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "================================"
echo ""
echo "📊 Deployment Status:"
aws ecs describe-services \
  --cluster ${ECS_CLUSTER} \
  --services ${ECS_SERVICE} \
  --region ${AWS_REGION} \
  --query "services[0].deployments[0].{Status:status,Running:runningCount,Desired:desiredCount,UpdatedAt:updatedAt}" \
  --output table

echo ""
echo "🌐 Application URL: https://curagenesiscrm.com"
echo ""
echo -e "${YELLOW}📝 Post-Deployment Steps:${NC}"
echo "1. Run database migration: npx prisma db push"
echo "2. Set NEXT_PUBLIC_MAIL_MOCK=0 in ECS task definition"
echo "3. Test the application"
echo ""
echo "📋 View logs:"
echo "  aws logs tail /ecs/curagenesis-crm --follow --region us-east-1"
echo ""
echo -e "${GREEN}Deployment complete!${NC} 🎉"

