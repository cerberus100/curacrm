# CuraGenesis CRM - Debugging & Monitoring Guide

## Health Check Endpoints

### Basic Health Check
```bash
curl https://curagenesiscrm.com/api/health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2025-10-10T...",
  "environment": {
    "hasVendorToken": true,
    "hasDatabaseUrl": true,
    "nodeEnv": "production"
  }
}
```

### Detailed Health Check (Admin-Only)
```bash
curl -H "Cookie: auth-token=<JWT>" \
  https://curagenesiscrm.com/api/health/detailed
```

Returns comprehensive system status including:
- Database connectivity and counts
- CuraGenesis API status
- Memory usage
- Error rates
- Recent errors

### Monitoring Dashboard (Admin-Only)
```bash
curl -H "Cookie: auth-token=<JWT>" \
  https://curagenesiscrm.com/api/admin/monitoring
```

Returns:
- Overall system health
- User statistics
- Account activation rates
- Order volumes (24h, 7d)
- Submission error rates
- Recent errors

---

## Logging System

### Log Levels:
- **DEBUG** - Detailed debugging info (dev only)
- **INFO** - General information
- **WARN** - Warning conditions
- **ERROR** - Error conditions

### View Logs:
```bash
# Real-time logs
aws logs tail /ecs/curagenesis-crm --follow --region us-east-1

# Last 5 minutes
aws logs tail /ecs/curagenesis-crm --since 5m --region us-east-1

# Filter for errors
aws logs tail /ecs/curagenesis-crm --since 1h --region us-east-1 \
  --filter-pattern "ERROR"

# Filter for specific endpoint
aws logs tail /ecs/curagenesis-crm --since 1h --region us-east-1 \
  --filter-pattern "api/kpi/overview"
```

---

## Common Issues & Solutions

### Issue: "Access Denied" for Admin Users

**Symptoms**: Admin logged in but seeing unauthorized page

**Causes**:
1. JWT cookie not being read properly
2. `await cookies()` missing in auth helpers
3. Token expired

**Solution**:
```bash
# Check if user is in localStorage
# Open browser console:
console.log(localStorage.getItem('current_user'))

# Logout and login again
# Verify JWT is set:
document.cookie

# Check server logs for auth errors
aws logs tail /ecs/curagenesis-crm --since 5m --region us-east-1 | grep -i "auth"
```

### Issue: Empty Data/Charts

**Symptoms**: Dashboard shows 0 or empty charts

**Causes**:
1. No data in database
2. API endpoint returning empty results
3. Practice sync hasn't been run

**Solution**:
```bash
# Check database for data
psql -h <DB_HOST> -U crmuser -d curagenesis_intake_crm \
  -c "SELECT COUNT(*) FROM accounts;"

# Run practice sync
curl -X POST https://curagenesiscrm.com/api/kpi/sync-practices \
  -H "Cookie: auth-token=<JWT>"

# Check if orders exist
psql -c "SELECT COUNT(*) FROM orders;"
```

### Issue: Practice Sync Not Working

**Symptoms**: Sync button doesn't save data

**Causes**:
1. CuraGenesis API token invalid
2. Database write permissions
3. Network connectivity

**Solution**:
```bash
# Test CuraGenesis API directly
curl -X POST \
  'https://sr9bkv1k3k.execute-api.us-east-1.amazonaws.com/Admin-Prod/api/partner/v1/practices' \
  -G --data-urlencode 'page_size=1' \
  -H 'x-vendor-key: <TOKEN>'

# Check database permissions
psql -c "INSERT INTO accounts (...) VALUES (...);"

# Check ECS task logs
aws logs tail /ecs/curagenesis-crm --since 5m --region us-east-1 | grep "sync"
```

### Issue: Slow Performance

**Symptoms**: Pages loading slowly

**Causes**:
1. Database queries not optimized
2. Missing indexes
3. Large data sets without pagination

**Solution**:
```bash
# Check slow queries
psql -c "SELECT query, mean_exec_time, calls 
         FROM pg_stat_statements 
         ORDER BY mean_exec_time DESC 
         LIMIT 10;"

# Check database size
psql -c "SELECT pg_size_pretty(pg_database_size('curagenesis_intake_crm'));"

# Monitor ECS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=curagenesis-crm-service-v2 \
  --start-time 2025-10-10T00:00:00Z \
  --end-time 2025-10-10T23:59:59Z \
  --period 3600 \
  --statistics Average
```

---

## Database Debugging

### Check Table Schemas:
```sql
-- List all tables
\dt

-- Describe users table
\d users

-- Check for missing columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users';
```

### Check Data Integrity:
```sql
-- Check for orphaned records
SELECT COUNT(*) FROM accounts WHERE owner_rep_id NOT IN (SELECT id FROM users);

-- Check for null required fields
SELECT COUNT(*) FROM accounts WHERE practice_name IS NULL;

-- Verify foreign keys
SELECT constraint_name, table_name 
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY';
```

### Performance Analysis:
```sql
-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## API Debugging

### Test Authentication:
```bash
# Login and get token
curl -X POST https://curagenesiscrm.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@curagenesis.com","password":"Money100!"}' \
  -c cookies.txt

# Use token in subsequent requests
curl -b cookies.txt https://curagenesiscrm.com/api/admin/monitoring
```

### Test Specific Endpoints:
```bash
# KPI Overview
curl -X POST https://curagenesiscrm.com/api/kpi/overview \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=<JWT>" \
  -d '{"dateRange":"30d"}'

# Practice Sync
curl -X POST https://curagenesiscrm.com/api/kpi/sync-practices \
  -H "Cookie: auth-token=<JWT>"

# Financials
curl https://curagenesiscrm.com/api/financials?practiceId=FAC-XXXX \
  -H "Cookie: auth-token=<JWT>"
```

### Check Request/Response:
```bash
# Verbose mode to see all headers
curl -v https://curagenesiscrm.com/api/health

# Include response headers
curl -i https://curagenesiscrm.com/api/health

# Time the request
time curl -s https://curagenesiscrm.com/api/kpi/overview
```

---

## ECS/Docker Debugging

### Check Running Tasks:
```bash
# List tasks
aws ecs list-tasks \
  --cluster curagenesis-cluster \
  --region us-east-1

# Get task details
aws ecs describe-tasks \
  --cluster curagenesis-cluster \
  --tasks <TASK_ARN> \
  --region us-east-1
```

### View Container Logs:
```bash
# Tail logs
aws logs tail /ecs/curagenesis-crm --follow --region us-east-1

# Search for errors
aws logs tail /ecs/curagenesis-crm --since 1h --region us-east-1 | grep -i error

# Filter by pattern
aws logs filter-log-events \
  --log-group-name /ecs/curagenesis-crm \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --region us-east-1
```

### Check Service Health:
```bash
# Service status
aws ecs describe-services \
  --cluster curagenesis-cluster \
  --services curagenesis-crm-service-v2 \
  --region us-east-1 | jq '.services[0] | {
    serviceName,
    status,
    desiredCount,
    runningCount,
    pendingCount
  }'

# Recent events
aws ecs describe-services \
  --cluster curagenesis-cluster \
  --services curagenesis-crm-service-v2 \
  --region us-east-1 | jq '.services[0].events[0:5]'
```

---

## Prisma Debugging

### Generate Fresh Client:
```bash
npx prisma generate
```

### Check Database Connection:
```bash
npx prisma db pull
```

### View Data in Prisma Studio:
```bash
npx prisma studio
```

### Run Migrations:
```bash
npx prisma db push
```

---

## Browser Debugging

### Check Network Requests:
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Look for failed requests (red)
5. Check request/response headers and payloads

### Check Console Errors:
1. Open DevTools Console
2. Look for red error messages
3. Check for failed API calls
4. Verify localStorage has user data

### Check Authentication:
```javascript
// In browser console
localStorage.getItem('current_user')
document.cookie
```

---

## Performance Monitoring

### CloudWatch Metrics:
```bash
# CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=curagenesis-crm-service-v2 \
  --start-time 2025-10-10T00:00:00Z \
  --end-time 2025-10-10T23:59:59Z \
  --period 3600 \
  --statistics Average,Maximum \
  --region us-east-1

# Memory utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=curagenesis-crm-service-v2 \
  --start-time 2025-10-10T00:00:00Z \
  --end-time 2025-10-10T23:59:59Z \
  --period 3600 \
  --statistics Average,Maximum \
  --region us-east-1
```

### Database Performance:
```sql
-- Active connections
SELECT COUNT(*) FROM pg_stat_activity 
WHERE datname = 'curagenesis_intake_crm';

-- Long-running queries
SELECT pid, now() - query_start AS duration, query 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY duration DESC;

-- Table bloat
SELECT schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Best Practices for CRM Debugging

### 1. Enable Structured Logging
- All logs in JSON format for easy parsing
- Include request IDs for tracing
- Log user actions for audit

### 2. Monitor Key Metrics
- API response times
- Database query performance
- Error rates
- User activity

### 3. Set Up Alerts
- High error rates (>5%)
- Slow API responses (>2s)
- Database connection issues
- Failed deployments

### 4. Regular Health Checks
- Automated health checks every 5 minutes
- Alert on degraded status
- Monitor CuraGenesis API connectivity

### 5. Error Tracking
- Centralized error logging
- Group by error type
- Track error frequency
- Monitor resolution time

---

## Quick Diagnostic Commands

```bash
# Full system health check
curl https://curagenesiscrm.com/api/health/detailed | jq .

# Check if admin can login
curl -X POST https://curagenesiscrm.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@curagenesis.com","password":"Money100!"}'

# Check database
psql -h <HOST> -U crmuser -d curagenesis_intake_crm -c "SELECT COUNT(*) FROM users;"

# Check ECS service
aws ecs describe-services \
  --cluster curagenesis-cluster \
  --services curagenesis-crm-service-v2 \
  --region us-east-1 | jq '.services[0].runningCount'

# View recent logs
aws logs tail /ecs/curagenesis-crm --since 5m --region us-east-1
```

---

## Troubleshooting Workflow

1. **Identify the Issue**
   - User report or monitoring alert
   - Check health endpoints
   - Review recent logs

2. **Gather Context**
   - Which page/feature is affected?
   - What user role?
   - Recent deployments?
   - Error messages?

3. **Check System Health**
   - Database responsive?
   - ECS tasks running?
   - CuraGenesis API accessible?

4. **Review Logs**
   - Check CloudWatch for errors
   - Look for patterns
   - Find stack traces

5. **Verify Fix**
   - Deploy fix
   - Monitor for 15-30 minutes
   - Verify error rate drops
   - Test affected functionality

---

## Contact & Escalation

### System Alerts:
- **Critical**: Database down, all tasks failing
- **High**: >10% error rate, auth failures
- **Medium**: Slow performance, partial failures
- **Low**: Individual errors, warnings

### Log Analysis Tools:
- CloudWatch Logs Insights
- grep/awk for pattern matching
- jq for JSON parsing
- Prisma Studio for database inspection

---

**This guide should help you quickly diagnose and resolve issues in production!**
