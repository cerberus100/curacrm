# Quick Database Setup for CuraGenesis CRM

Since the CDK infrastructure needs fixing, here are quick alternatives to get a PostgreSQL database running:

## Option 1: Neon (Recommended - Fastest)

1. Go to https://neon.tech and sign up (free)
2. Create a new project
3. Copy the connection string (it looks like: `postgresql://user:pass@host/neondb?sslmode=require`)
4. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

## Option 2: Supabase

1. Go to https://supabase.com and sign up (free)
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string
5. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

## Option 3: AWS RDS (Manual)

1. Go to AWS RDS Console
2. Create a PostgreSQL database
3. Choose "Free tier" template
4. Note down the endpoint and credentials
5. Create the connection string:
   ```
   postgresql://username:password@endpoint:5432/dbname
   ```

## Update Amplify with the Database URL

Once you have your database URL:

```bash
# Update the DATABASE_URL in Amplify
aws amplify update-branch \
  --app-id d2zvm2tunkv4bq \
  --branch-name main \
  --environment-variables DATABASE_URL="your-database-url-here"

# Trigger a new deployment
aws amplify start-job \
  --app-id d2zvm2tunkv4bq \
  --branch-name main \
  --job-type RELEASE
```

## Run Initial Migrations

After setting up the database:

```bash
# Set the DATABASE_URL locally
export DATABASE_URL="your-database-url-here"

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed initial data
npx prisma db seed
```

## Important Notes

- Keep your DATABASE_URL secret and never commit it to git
- Use SSL connections for production databases
- The free tiers are suitable for development and small projects
- For production, consider the CDK deployment or a managed AWS RDS instance
