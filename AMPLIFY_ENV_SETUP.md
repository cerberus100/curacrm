# AWS Amplify Environment Variables Setup

## Required Environment Variables

Add these to your AWS Amplify Console under "Environment variables":

### 1. CuraGenesis API Configuration

```bash
# Vendor token for user creation and practice management
CURAGENESIS_VENDOR_TOKEN=Nb9sQCZnrAxAxS4KrysMLzRUQ2HN21hbZmpshgZYb1cT7sEPdJkNEE_MhfB59pDt

# Base URL for CuraGenesis API (if not already set)
CURAGENESIS_API_BASE=https://api.curagenesis.com

# API key for practice intake submissions (if you have one)
CURAGENESIS_API_KEY=your_api_key_here

# Timeout for API requests
CURAGENESIS_API_TIMEOUT_MS=10000

# Metrics API key (if you have one)
CG_METRICS_API_KEY=your_metrics_key_here
```

### 2. Optional Security Tokens

```bash
# For webhook signature verification (optional)
CURAGENESIS_WEBHOOK_SECRET=generate_a_random_secret_here

# For cron job authentication (optional)
CRON_SECRET=generate_another_random_secret_here
```

### 3. Database Configuration (if not already set)

```bash
# Your PostgreSQL connection string
DATABASE_URL=postgresql://username:password@host:port/database_name?schema=public
```

## How to Add in AWS Amplify:

1. **Open AWS Amplify Console**
   - Go to: https://console.aws.amazon.com/amplify/
   - Select your app: "curacrm"

2. **Navigate to Environment Variables**
   - Click on your app
   - Go to "App settings" → "Environment variables"

3. **Add Variables**
   - Click "Manage variables"
   - Add each variable one by one:
     - Variable: `CURAGENESIS_VENDOR_TOKEN`
     - Value: `Nb9sQCZnrAxAxS4KrysMLzRUQ2HN21hbZmpshgZYb1cT7sEPdJkNEE_MhfB59pDt`
   - Click "Save"

4. **Redeploy**
   - The app will automatically redeploy with the new variables
   - Or manually trigger a new build

## Verification

After deployment, visit:
```
https://d2zvm2tunkv4bq.amplifyapp.com/test-config
```

Click "Check Configuration" to verify all variables are set correctly.

## Security Notes

- The vendor token is sensitive - treat it like a password
- Consider rotating tokens periodically
- Use AWS Secrets Manager for production deployments
