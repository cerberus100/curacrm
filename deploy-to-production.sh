#!/bin/bash

# Deploy CRM to CuraGenesis Production Account
# Run this after testing in dev to push updates to production

set -e

echo "🚀 Deploying to CuraGenesis Production"
echo "======================================"

PROD_ACCOUNT="516267217490"
REGION="us-east-1"
ECR_REPO="curagenesis-crm"

# Build latest (or pull from dev)
echo "Building latest version..."
docker buildx build --platform linux/amd64 -t ${ECR_REPO}:latest --load .

echo "✓ Build complete"

# Login to production ECR
echo "Logging into production ECR..."
aws ecr get-login-password --region ${REGION} | \
  docker login --username AWS --password-stdin ${PROD_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com

echo "✓ Logged in"

# Tag for production
echo "Tagging for production..."
docker tag ${ECR_REPO}:latest ${PROD_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}:latest

echo "✓ Tagged"

# Push to production ECR
echo "Pushing to production ECR..."
docker push ${PROD_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}:latest

echo "✓ Image pushed"

echo ""
echo "✅ Production image ready!"
echo "=========================="
echo ""
echo "Next steps:"
echo "1. Notify CuraGenesis team that new version is available"
echo "2. They run: aws ecs update-service --cluster curagenesis-cluster --service curagenesis-crm --force-new-deployment --region us-east-1"
echo "3. Or they can deploy manually via ECS console"
echo ""
echo "🎉 Production deployment complete!"

