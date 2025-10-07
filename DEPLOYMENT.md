# CuraGenesis Intake CRM - Deployment Guide

## Prerequisites

- Node.js 18+ runtime
- PostgreSQL 14+ database
- CuraGenesis API credentials
- CuraGenesis Metrics API credentials

## Environment Setup

### Required Environment Variables

```env
# Database Connection
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# CuraGenesis API - Intake
CURAGENESIS_API_BASE="https://api.curagenesis.com"
CURAGENESIS_API_KEY="<your_secret_key>"
CURAGENESIS_API_TIMEOUT_MS="10000"

# CuraGenesis API - Metrics
NEXT_PUBLIC_CG_METRICS_BASE="https://api.curagenesis.com"
CG_METRICS_API_KEY="<your_secret_metrics_key>"

# Application
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

## Database Setup

### 1. Create Database

```sql
CREATE DATABASE curagenesis_crm;
CREATE USER crm_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE curagenesis_crm TO crm_user;
```

### 2. Run Migrations

```bash
npm install
npm run db:generate
npm run db:migrate
```

### 3. Seed Initial Data (Optional)

```bash
npm run db:seed
```

This creates:
- Admin user: `admin@curagenesis.com`
- Sales rep: `rep@curagenesis.com`
- Sample account with contact

## Build & Deploy

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Configure environment variables in Vercel dashboard.

### Option 2: Docker

```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t curagenesis-crm .
docker run -p 3000:3000 --env-file .env curagenesis-crm
```

### Option 3: Traditional Server

```bash
# Build
npm run build

# Start with PM2
npm install -g pm2
pm2 start npm --name "curagenesis-crm" -- start
pm2 save
pm2 startup
```

## Security Checklist

- [ ] SSL/TLS certificate installed (HTTPS)
- [ ] Environment variables secured (not in code)
- [ ] Database credentials rotated
- [ ] API keys stored securely
- [ ] CORS configured correctly
- [ ] Rate limiting enabled (if applicable)
- [ ] Security headers enabled (already in next.config.mjs)
- [ ] Database connection pooling configured
- [ ] Backup strategy in place

## Health Checks

### Database Connection

```bash
npx prisma db pull
```

### API Endpoints

```bash
# Test account creation
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "practiceName": "Test Practice",
    "specialty": "Family Medicine",
    "state": "CA",
    "ownerRepId": "<user_id>"
  }'

# Test KPI endpoint
curl -X POST http://localhost:3000/api/kpi/overview \
  -H "Content-Type: application/json" \
  -d '{"dateRange": "30d"}'
```

## Monitoring

### Recommended Metrics

- Response time (P50, P95, P99)
- Error rate (4xx, 5xx)
- Database connection pool usage
- CuraGenesis API success rate
- Submission success/failure ratio

### Logging

Application logs include:
- API requests/responses
- Submission attempts
- Validation errors
- Database queries (in development)

## Backup & Recovery

### Database Backups

```bash
# PostgreSQL dump
pg_dump -U crm_user -d curagenesis_crm > backup_$(date +%Y%m%d).sql

# Restore
psql -U crm_user -d curagenesis_crm < backup_YYYYMMDD.sql
```

### Automated Backups

Set up daily cron job:

```cron
0 2 * * * pg_dump -U crm_user -d curagenesis_crm | gzip > /backups/crm_$(date +\%Y\%m\%d).sql.gz
```

## Troubleshooting

### Issue: Database Connection Failed

**Solution:** Check DATABASE_URL, ensure PostgreSQL is running, verify credentials

### Issue: API Submission Failing

**Solution:** 
1. Verify CURAGENESIS_API_KEY is correct
2. Check CURAGENESIS_API_BASE endpoint
3. Review submission logs in `/api/submissions`
4. Test CuraGenesis API directly with curl

### Issue: KPI Dashboard Not Loading

**Solution:**
1. Verify CG_METRICS_API_KEY is set (server-side)
2. Check NEXT_PUBLIC_CG_METRICS_BASE
3. Test metrics endpoint with curl
4. Review browser console for errors

### Issue: Build Failures

**Solution:**
1. Run `npm run type-check` to find TypeScript errors
2. Run `npm run lint` to find linting issues
3. Ensure all environment variables are set
4. Check Node.js version (18+)

## Scaling Considerations

### Horizontal Scaling

- Application is stateless, can run multiple instances
- Use load balancer (ALB, Nginx, etc.)
- Database connection pooling recommended

### Performance Optimization

- Enable Next.js output: 'standalone' in next.config.mjs
- Use CDN for static assets
- Enable PostgreSQL connection pooling
- Consider Redis for session/cache (if needed)

### Rate Limiting

Consider adding rate limiting middleware:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Implement rate limiting logic
  return NextResponse.next();
}
```

## Rollback Plan

1. Keep previous build artifacts
2. Database migration rollback:
   ```bash
   npm run db:migrate -- rollback
   ```
3. Revert to previous deployment
4. Notify stakeholders

## Support Contacts

- **Technical Issues:** dev-team@company.com
- **API Issues:** support@curagenesis.com
- **Infrastructure:** ops-team@company.com

---

Last updated: 2025-10-07
