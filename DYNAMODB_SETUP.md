# ============================================================================
# DYNAMODB SETUP GUIDE - Real Data Integration
# ============================================================================

## ✅ WHAT WE JUST DID

We've updated Alex's CRM to query **real CuraGenesis data** directly from DynamoDB!

**Changes Made:**
1. ✅ Installed AWS SDK (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
2. ✅ Created DynamoDB client (`src/lib/dynamodb-client.ts`)
3. ✅ Created metrics calculator (`src/lib/metrics-calculator.ts`)
4. ✅ Updated all KPI API endpoints to use real data:
   - `/api/kpi/overview` - Real overview metrics
   - `/api/kpi/geo` - Real geographic data
   - `/api/kpi/leaderboard` - Real rep leaderboard
   - `/api/kpi/segments` - Real segment breakdown

**No more mock data!** 🎉

---

## 🔐 STEP 1: CREATE AWS READ-ONLY CREDENTIALS

You need AWS credentials with **READ-ONLY** access to DynamoDB.

### Option A: Use Existing Credentials (If You Have Them)

If you already have AWS credentials with DynamoDB read access, skip to Step 2.

### Option B: Create New Read-Only IAM User (Recommended)

**We'll create this together in the AWS Console:**

1. Go to AWS IAM Console: https://us-east-1.console.aws.amazon.com/iam
2. Click "Users" → "Create user"
3. User name: `curacrm-readonly`
4. Click "Next"
5. Select "Attach policies directly"
6. Click "Create policy" (opens new tab)
7. Use this JSON policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:DescribeTable"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-2:516267217490:table/BAAData",
        "arn:aws:dynamodb:us-east-2:516267217490:table/BAAData/index/*",
        "arn:aws:dynamodb:us-east-2:516267217490:table/Orders_Medical",
        "arn:aws:dynamodb:us-east-2:516267217490:table/Orders_Medical/index/*",
        "arn:aws:dynamodb:us-east-2:516267217490:table/Reps",
        "arn:aws:dynamodb:us-east-2:516267217490:table/Reps/index/*",
        "arn:aws:dynamodb:us-east-2:516267217490:table/Users",
        "arn:aws:dynamodb:us-east-2:516267217490:table/Users/index/*"
      ]
    }
  ]
}
```

8. Name the policy: `CuraCRM-DynamoDB-ReadOnly`
9. Click "Create policy"
10. Go back to the user creation tab
11. Refresh policies and select `CuraCRM-DynamoDB-ReadOnly`
12. Click "Next" → "Create user"
13. Select the user → "Security credentials" tab
14. Click "Create access key"
15. Select "Application running outside AWS"
16. Click "Next" → "Create access key"
17. **SAVE THESE CREDENTIALS** (you'll only see them once!)

---

## 📝 STEP 2: CREATE .env FILE

Create a file called `.env` in the root of the curacrm directory:

```bash
# Copy the example
cp env.example .env
```

Or create `.env` manually with this content:

```env
# ============================================================================
# DATABASE (PostgreSQL)
# ============================================================================
DATABASE_URL="postgresql://user:password@localhost:5432/curacrm?schema=public"

# ============================================================================
# AWS CREDENTIALS - For DynamoDB Access
# ============================================================================
AWS_REGION="us-east-2"
AWS_ACCESS_KEY_ID="PASTE_YOUR_ACCESS_KEY_HERE"
AWS_SECRET_ACCESS_KEY="PASTE_YOUR_SECRET_KEY_HERE"

# ============================================================================
# CURAGENESIS API - For Practice Submissions
# ============================================================================
CURAGENESIS_API_BASE="https://api.curagenesis.com"
CURAGENESIS_API_KEY="YOUR_API_KEY_FROM_IAN"
CURAGENESIS_API_TIMEOUT_MS="10000"

# ============================================================================
# APPLICATION
# ============================================================================
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**IMPORTANT:** 
- Replace `PASTE_YOUR_ACCESS_KEY_HERE` with your AWS Access Key ID
- Replace `PASTE_YOUR_SECRET_KEY_HERE` with your AWS Secret Access Key
- Never commit `.env` file to git!

---

## 🚀 STEP 3: TEST THE DASHBOARD

```bash
# Make sure dependencies are installed
npm install

# Run the development server
npm run dev
```

Visit: http://localhost:3000/dashboard

**You should now see REAL data from CuraGenesis!** 🎉

---

## 🔍 TROUBLESHOOTING

### Error: "Missing AWS credentials"

**Fix:** Make sure your `.env` file has:
```env
AWS_ACCESS_KEY_ID="your_key_here"
AWS_SECRET_ACCESS_KEY="your_secret_here"
AWS_REGION="us-east-2"
```

### Error: "AccessDeniedException" or "User ... is not authorized"

**Fix:** Your IAM user doesn't have permission. Check:
1. Policy is attached to the user
2. Policy has correct table names and regions
3. ARNs match your AWS account ID (516267217490)

### Error: "ResourceNotFoundException: Requested resource not found"

**Fix:** Table name might be wrong. Check:
1. Are the tables actually named `BAAData`, `Orders_Medical`, `Reps`, `Users`?
2. Are they in `us-east-2` region?
3. Run `aws dynamodb list-tables --region us-east-2` to verify

### Dashboard shows "0" for everything

**Possible causes:**
1. No data in DynamoDB tables yet
2. Date range is too narrow (try 90 days)
3. Data doesn't have `createdAt` timestamps
4. Check browser console for errors

---

## 📊 WHAT DATA IS BEING QUERIED

Your dashboard now queries these DynamoDB tables:

| Table | Used For |
|-------|----------|
| **BAAData** | Facilities/practices, contact info, states |
| **Orders_Medical** | Orders, sales, revenue calculations |
| **Reps** | Sales rep leaderboard, rep names |
| **Users** | User accounts (linked to orders) |

**Metrics Calculated:**
- Total sales volume
- Average order value
- Active practices
- Activation rate
- Days to first order
- Geographic breakdown by state
- Rep leaderboard with rankings
- Segment analysis (specialty, lead source)

---

## 🎯 NEXT STEPS

Once your dashboard is working with real data:

1. **Deploy to Production**
   - Add environment variables to your hosting platform (Vercel/Amplify)
   - Never expose AWS credentials in client-side code
   - Use server-side API routes only (which you already are!)

2. **Add More Metrics**
   - Edit `src/lib/metrics-calculator.ts`
   - Query additional DynamoDB tables
   - Calculate custom KPIs

3. **Optimize Performance**
   - Add caching for expensive queries
   - Use DynamoDB indexes for faster lookups
   - Consider pagination for large datasets

4. **Add Rep Tracking**
   - Update intake submission to include rep info
   - Track which rep added each practice

---

## ❓ NEED HELP?

If you run into issues:
1. Check the browser console for errors
2. Check the Next.js terminal for server errors
3. Verify AWS credentials are correct
4. Make sure DynamoDB tables exist and have data

---

**YOU'RE DONE!** Your dashboard now shows real CuraGenesis metrics! 🚀

