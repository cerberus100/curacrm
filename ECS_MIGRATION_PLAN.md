# ECS Fargate Migration Plan

## Phase 1: Containerize (Day 1)

### 1. Create Dockerfile
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/prisma ./prisma
RUN npm ci --production
RUN npx prisma generate

EXPOSE 3000
CMD ["npm", "start"]
```

### 2. Test Locally
```bash
docker build -t curagenesis-crm .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e CURAGENESIS_VENDOR_TOKEN="..." \
  curagenesis-crm
```

## Phase 2: AWS Setup (Day 1-2)

### 1. Push to ECR
```bash
aws ecr create-repository --repository-name curagenesis-crm
docker tag curagenesis-crm:latest [ACCOUNT].dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest
docker push [ACCOUNT].dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest
```

### 2. Create ECS Infrastructure
- Use existing VPC from RDS
- Create ECS Cluster
- Create Task Definition
- Create ALB
- Create ECS Service

## Phase 3: Deploy with CDK (Recommended)

Create new CDK stack:
```typescript
export class CrmEcsStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    // Use existing VPC
    const vpc = Vpc.fromLookup(this, 'ExistingVpc', {
      vpcId: 'vpc-xxxxx'
    });

    // Create Fargate cluster
    const cluster = new ecs.Cluster(this, 'CrmCluster', {
      vpc,
      clusterName: 'curagenesis-crm'
    });

    // Create task definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'CrmTask', {
      memoryLimitMiB: 1024,
      cpu: 512
    });

    // Add container
    const container = taskDefinition.addContainer('crm', {
      image: ecs.ContainerImage.fromEcrRepository(
        ecr.Repository.fromRepositoryName(this, 'Repo', 'curagenesis-crm'),
        'latest'
      ),
      environment: {
        NODE_ENV: 'production',
        // Add other env vars
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(dbSecret),
        CURAGENESIS_VENDOR_TOKEN: ecs.Secret.fromSecretsManager(apiSecret)
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'crm'
      })
    });

    container.addPortMappings({
      containerPort: 3000,
      protocol: ecs.Protocol.TCP
    });

    // Create service
    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'CrmService', {
      cluster,
      taskDefinition,
      desiredCount: 2,
      domainName: 'curagenesiscrm.com',
      domainZone: yourHostedZone
    });

    // Auto-scaling
    const scaling = service.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 10
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70
    });
  }
}
```

## Phase 4: Migration Steps

1. **Deploy ECS infrastructure** (CDK or Console)
2. **Test with staging subdomain**
3. **Update DNS** to point to ALB
4. **Monitor and verify**
5. **Decommission Amplify**

## Benefits

- ✅ No more SSR deployment issues
- ✅ Auto-scaling built-in
- ✅ Blue/green deployments
- ✅ CloudWatch integration
- ✅ Secrets Manager for credentials
- ✅ Direct VPC connection to RDS
- ✅ Production-ready from day 1

## Timeline

- **Day 1**: Dockerize and test locally
- **Day 2**: Deploy to ECS
- **Day 3**: Testing and DNS cutover

## Cost Estimate

- Fargate: ~$50-100/month (2 tasks)
- ALB: ~$20/month
- CloudWatch: ~$10/month
- **Total**: ~$80-130/month

Much more reliable than Amplify for SSR!
