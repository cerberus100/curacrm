# CuraGenesis Data Sync Automation

The CRM now supports multiple ways to keep practice data synchronized with CuraGenesis:

## 1. Real-Time Webhooks (Recommended)

The most responsive option - updates appear instantly when events occur in CuraGenesis.

### Setup:
1. Configure CuraGenesis to send webhooks to:
   ```
   https://your-domain.com/api/webhooks/curagenesis/practice-update
   ```

2. Add webhook secret to `.env`:
   ```
   CURAGENESIS_WEBHOOK_SECRET="your_webhook_secret_here"
   ```

3. Supported webhook events:
   - `practice.created` - New practice enrolled
   - `practice.updated` - Practice information changed
   - `order.placed` - New order placed
   - `practice.activated` - Practice becomes active

### Benefits:
- ⚡ Instant updates (< 1 second)
- 📊 Real-time notifications in dashboard
- 🔔 Immediate alerts for sales reps
- 📈 Live order tracking

## 2. Scheduled Sync (Automatic)

Runs automatically at regular intervals using Vercel Cron or AWS EventBridge.

### Default Schedule:
- **Every 6 hours**: Near real-time updates
- **Daily at 2 AM UTC**: Complete sync

### Setup with Vercel:
The `vercel.json` file is already configured. Just deploy to Vercel.

### Setup with AWS:
1. Create EventBridge rule targeting:
   ```
   https://your-domain.com/api/kpi/sync-practices/cron
   ```

2. Add cron authentication (optional):
   ```
   CRON_SECRET="your_cron_secret_here"
   ```

### Benefits:
- 🔄 Automatic updates without manual intervention
- 📅 Predictable sync times
- 🛡️ Resilient to webhook failures
- 📊 Batch processing efficiency

## 3. Manual Sync (On-Demand)

Available in the dashboard for immediate updates when needed.

### How to Use:
1. Go to Dashboard → Practices tab
2. Click "Sync Now" button
3. Data updates within seconds

### Benefits:
- 👆 User-controlled timing
- 🔍 Immediate verification after changes
- 🛠️ Useful for troubleshooting

## Data Flow Architecture

```
CuraGenesis API
      ↓
┌─────────────────────────────────┐
│   Real-Time Webhooks (Instant)  │
├─────────────────────────────────┤
│   Scheduled Sync (Every 6h)     │
├─────────────────────────────────┤
│   Manual Sync (On-Demand)       │
└─────────────────────────────────┘
      ↓
Local Database (PostgreSQL)
      ↓
┌─────────────────────────────────┐
│  Dashboard KPIs (Live Updates)  │
│  • Total Orders                 │
│  • Active Practices             │
│  • Geographic Distribution      │
│  • Sales Rep Performance        │
└─────────────────────────────────┘
```

## Sync Status Monitoring

The system tracks sync health automatically:

1. **Last Sync Time**: Visible in Practices tab
2. **Sync History**: Stored in database
3. **Error Logging**: Failed syncs are logged
4. **Notifications**: Real-time alerts for important events

## Best Practices

1. **Use Multiple Methods**: Combine webhooks (real-time) with scheduled sync (backup)
2. **Monitor Sync Health**: Check last sync time regularly
3. **Handle Duplicates**: System automatically deduplicates based on practice ID
4. **Rate Limiting**: Automatic 1-hour minimum between syncs

## Troubleshooting

### Sync Not Working?
1. Check environment variables are set correctly
2. Verify API credentials are valid
3. Check network connectivity
4. Review error logs in Settings table

### Missing Data?
1. Click "Sync Now" for immediate update
2. Check if practice has CuraGenesis user ID
3. Verify practice was created through this CRM

### Performance Issues?
1. Sync runs are rate-limited to once per hour
2. Large datasets are processed in batches
3. Webhook processing is asynchronous
