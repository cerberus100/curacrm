# CuraGenesis Infrastructure (CDK)

AWS CDK infrastructure for the CuraGenesis Intake CRM backend.

## 📦 What Gets Deployed

### VPC Stack (`CG-Vpc`)
- VPC with 2 availability zones
- Public and private subnets
- NAT Gateway for private subnet egress

### Database Stack (`CG-Database`)
- Aurora PostgreSQL Serverless v2 cluster
- RDS Proxy for Lambda connection pooling
- Secrets Manager for database credentials
- Multi-AZ deployment

### Storage Stack (`CG-Storage`)
- S3 bucket for documents
- Server-side encryption
- Versioning enabled
- Lifecycle policies for archival

### Queue Stack (`CG-Queues`)
- SQS queue for async processing
- Dead letter queue for failed messages
- Long polling enabled

### API Stack (`CG-Api`)
- API Gateway REST API
- Lambda functions (intake + KPI proxy)
- VPC integration
- CloudWatch logging

### Auth Stack (`CG-AuthPrep`)
- Cognito User Pool
- Custom attributes for roles
- MFA support

## 🚀 Deployment

### Prerequisites

```bash
# Install AWS CDK CLI
npm install -g aws-cdk

# Configure AWS credentials
aws configure

# Set your AWS account and region
export CDK_DEFAULT_ACCOUNT=123456789012
export CDK_DEFAULT_REGION=us-east-1
```

### Deploy

```bash
cd infra

# Install dependencies
npm install

# Bootstrap CDK (first time only)
npm run cdk bootstrap

# Deploy all stacks
npm run deploy

# Or deploy specific stack
npx cdk deploy CG-Database
```

## 📊 Stack Outputs

After deployment, CDK will output values like:

```
CG-Database.DbProxyEndpoint = cg-database-dbproxy-xxx.proxy-xxx.us-east-1.rds.amazonaws.com
CG-Database.DbSecretArn = arn:aws:secretsmanager:us-east-1:xxx:secret:xxx
CG-Database.DbName = curagenesis
CG-Storage.DocsBucketName = cg-storage-docsbucket-xxx
CG-Api.ApiUrl = https://xxx.execute-api.us-east-1.amazonaws.com/prod/
CG-AuthPrep.UserPoolId = us-east-1_xxx
```

## 🔐 Generate DATABASE_URL

Use the helper script to generate the full DATABASE_URL:

```bash
cd infra

node scripts/print-db-url.mjs \
  <DbSecretArn> \
  <DbProxyEndpoint> \
  <DbName>

# Example:
node scripts/print-db-url.mjs \
  arn:aws:secretsmanager:us-east-1:123456789:secret:CG-Database-PgSecret-xxx \
  cg-database-dbproxy-xxx.proxy-xxx.us-east-1.rds.amazonaws.com \
  curagenesis
```

This will output:
```
postgresql://cg_admin:xxxxx@cg-database-dbproxy-xxx.proxy-xxx.us-east-1.rds.amazonaws.com:5432/curagenesis
```

## 🔧 Configure Amplify

After CDK deployment, set these environment variables in **Amplify Console** > **App Settings** > **Environment variables**:

| Variable | Source | Example |
|----------|--------|---------|
| `DATABASE_URL` | Run `print-db-url.mjs` | `postgresql://user:pass@host:5432/db` |
| `CURAGENESIS_API_BASE` | Fixed | `https://api.curagenesis.com` |
| `CURAGENESIS_API_KEY` | Your API key | `sk_live_xxx` |
| `CURAGENESIS_API_TIMEOUT_MS` | Fixed | `10000` |
| `NEXT_PUBLIC_CG_METRICS_BASE` | Fixed | `https://api.curagenesis.com` |
| `CG_METRICS_API_KEY` | Your metrics key | `mk_live_xxx` |
| `SKIP_AUTH` | Environment-specific | `false` (prod), `true` (dev) |

## 🗄️ Database Setup

After deployment, connect to your database and run migrations:

```bash
# From the main app directory (not infra/)
cd ..

# Set DATABASE_URL from the script output
export DATABASE_URL="postgresql://..."

# Run Prisma migrations
npx prisma db push

# Seed database
npx prisma db seed
```

## 📝 Stack Details

### Cost Estimate
- **Aurora Serverless v2**: ~$50-100/month (depending on usage)
- **RDS Proxy**: ~$15/month
- **NAT Gateway**: ~$32/month
- **Lambda**: Pay per use (likely <$10/month)
- **S3**: Pay per use (likely <$5/month)
- **SQS**: Pay per use (likely <$1/month)

**Total**: ~$100-150/month for production workload

### Scaling
- Aurora scales from 2-4 ACUs automatically
- Lambda concurrency: up to 1000 concurrent executions
- API Gateway: unlimited requests

### Security
- ✅ All resources in private subnets
- ✅ RDS Proxy for connection pooling
- ✅ Secrets Manager for credentials
- ✅ S3 bucket encryption
- ✅ VPC security groups
- ✅ SSL/TLS required

## 🧹 Cleanup

To delete all resources:

```bash
npm run cdk destroy --all
```

⚠️ **Warning**: This will delete:
- Database (if deletion protection is off)
- S3 bucket contents
- All Lambda functions
- Cognito users

## 📖 Next Steps

1. Deploy CDK stacks
2. Run `print-db-url.mjs` to get DATABASE_URL
3. Set Amplify environment variables
4. Push code to trigger Amplify build
5. Run database migrations
6. Test API endpoints

## 🆘 Troubleshooting

### Lambda can't connect to database
- Check security groups allow Lambda → RDS Proxy
- Verify RDS Proxy is in correct VPC subnets
- Check Lambda has VPC permissions

### DATABASE_URL not working
- Ensure you used RDS Proxy endpoint (not cluster endpoint)
- Verify secret has `username` and `password` fields
- Check database name matches

### CDK deploy fails
- Run `npm run cdk bootstrap` first
- Check AWS credentials: `aws sts get-caller-identity`
- Verify region is set: `echo $CDK_DEFAULT_REGION`

## 📚 Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Aurora Serverless v2](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html)
- [RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy.html)
- [Amplify Hosting](https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html)
