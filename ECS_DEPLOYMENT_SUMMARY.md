# ECS Deployment Summary

## ✅ Completed Steps

### 1. Fixed All TypeScript and Enum Issues
- Migrated all enum values to match Prisma schema:
  - Role: `admin`/`rep` → `ADMIN`/`AGENT`
  - AccountStatus: `draft`/`ready_to_send`/`sent`/`failed`/`acknowledged` → `PENDING`/`ACTIVE`/`INACTIVE`/`SUBMITTED`
  - SubmissionStatus: `pending`/`sent`/`failed` → `PENDING`/`SUCCESS`/`FAILED`
  - DocumentType: `baa`/`w9` → `BAA`/`W9`
  - DocumentStatus: `signed` → `SIGNED`
  - ContactType: `clinician`/`owner_physician` → `clinical`/`provider`
- Fixed all null safety issues with optional chaining

### 2. Successfully Built Docker Image
- Created multi-stage Dockerfile with Alpine Linux
- Image size: 331MB
- Includes all necessary dependencies and Prisma client

### 3. Pushed to AWS ECR
- Repository: `337909762852.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest`
- Successfully authenticated and pushed

## 🚀 Next Steps

### 1. Deploy ECS Infrastructure
We need to create the ECS cluster, task definition, and service. Here's a simple approach:

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name curagenesis-cluster --region us-east-1

# Create task execution role (if not exists)
aws iam create-role --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach policy
aws iam attach-role-policy --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

### 2. Create Task Definition
Create `task-definition.json`:
```json
{
  "family": "curagenesis-crm",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::337909762852:role/ecsTaskExecutionRole",
  "containerDefinitions": [{
    "name": "curagenesis-crm",
    "image": "337909762852.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest",
    "portMappings": [{
      "containerPort": 3000,
      "protocol": "tcp"
    }],
    "environment": [
      {"name": "NODE_ENV", "value": "production"},
      {"name": "DATABASE_URL", "value": "postgresql://crmuser:Olhu46v9jpQ6RnqHNsKQ@cura-genesis-crm-db.c6ds4c4qok1n.us-east-1.rds.amazonaws.com:5432/curagenesis_intake_crm?sslmode=require"},
      {"name": "CURAGENESIS_VENDOR_TOKEN", "value": "Nb9sQCZnrAxAxS4KrysMLzRUQ2HN21hbZmpshgZYb1cT7sEPdJkNEE_MhfB59pDt"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/curagenesis-crm",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}
```

### 3. Create Service
```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster curagenesis-cluster \
  --service-name curagenesis-crm-service \
  --task-definition curagenesis-crm \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### 4. Set up Load Balancer
- Create an Application Load Balancer
- Create target group for ECS service
- Configure health checks for `/api/health`
- Update ECS service to use the load balancer

### 5. Configure Domain
- Point `curagenesiscrm.com` to the ALB
- Set up SSL certificate in ACM
- Configure HTTPS listener on ALB

## 📝 Environment Variables Needed
```env
NODE_ENV=production
DATABASE_URL=postgresql://crmuser:Olhu46v9jpQ6RnqHNsKQ@cura-genesis-crm-db.c6ds4c4qok1n.us-east-1.rds.amazonaws.com:5432/curagenesis_intake_crm?sslmode=require
CURAGENESIS_VENDOR_TOKEN=Nb9sQCZnrAxAxS4KrysMLzRUQ2HN21hbZmpshgZYb1cT7sEPdJkNEE_MhfB59pDt
NEXTAUTH_URL=https://curagenesiscrm.com
NEXTAUTH_SECRET=<generate-a-secret>
```

## 🔒 Security Considerations
1. Move sensitive environment variables to AWS Secrets Manager
2. Use VPC endpoints for ECR and S3
3. Restrict security group to only allow traffic from ALB
4. Enable container insights for monitoring
5. Set up CloudWatch alarms for service health

## 🎯 Benefits of ECS over Amplify
- Full control over infrastructure
- Better scaling options
- No SSR limitations
- Native AWS service integration
- Cost-effective for production workloads
- Better monitoring and logging
- Blue/green deployments
- Auto-scaling based on metrics
