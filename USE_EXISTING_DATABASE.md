# Using the Existing CuraGenesis CRM Database

You already have a PostgreSQL database deployed for this project!

## Database Details
- **Identifier**: cura-genesis-crm-db
- **Endpoint**: cura-genesis-crm-db.c6ds4c4qok1n.us-east-1.rds.amazonaws.com
- **Port**: 5432
- **Database Name**: cura_genesis_crm
- **Username**: crmuser
- **Engine**: PostgreSQL

## Steps to Use This Database

### 1. Reset the Database Password (if needed)

Since we couldn't find the password in Secrets Manager, you may need to reset it:

```bash
# Generate a new secure password
NEW_PASSWORD=$(openssl rand -base64 32)
echo "New password: $NEW_PASSWORD"

# Update the RDS instance with the new password
aws rds modify-db-instance \
  --db-instance-identifier cura-genesis-crm-db \
  --master-user-password "$NEW_PASSWORD" \
  --apply-immediately

# Save it somewhere secure!
```

### 2. Construct the DATABASE_URL

```bash
DATABASE_URL="postgresql://crmuser:YOUR_PASSWORD@cura-genesis-crm-db.c6ds4c4qok1n.us-east-1.rds.amazonaws.com:5432/cura_genesis_crm?sslmode=require"
```

### 3. Update Amplify Environment Variables

```bash
aws amplify update-branch \
  --app-id d2zvm2tunkv4bq \
  --branch-name main \
  --environment-variables DATABASE_URL="$DATABASE_URL"
```

### 4. Run Database Migrations

```bash
# Set the DATABASE_URL locally
export DATABASE_URL="postgresql://..."

# Run migrations
cd /Users/alexsiegel/curasalescrm
npx prisma migrate deploy
```

### 5. Trigger a New Deployment

```bash
aws amplify start-job \
  --app-id d2zvm2tunkv4bq \
  --branch-name main \
  --job-type RELEASE
```

## Alternative: Create Password in Secrets Manager

If you prefer to store the password securely:

```bash
# Create a secret for the database
aws secretsmanager create-secret \
  --name cura-genesis-crm-db-password \
  --description "Password for CuraGenesis CRM database" \
  --secret-string "{\"username\":\"crmuser\",\"password\":\"YOUR_PASSWORD\"}"
```

## Security Group Check

The database uses security group: `sg-0d1d78f70edc1e051`

Make sure this security group allows connections from:
1. Your Amplify app (if using VPC)
2. Your local machine (for migrations)
3. Lambda functions (if any)

To check current rules:
```bash
aws ec2 describe-security-groups --group-ids sg-0d1d78f70edc1e051
```
