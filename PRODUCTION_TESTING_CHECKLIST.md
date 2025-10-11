# Production Testing Checklist - CuraGenesis CRM

## System Information
- **URL**: https://curagenesiscrm.com
- **Admin**: admin@curagenesis.com / Money100!
- **Health**: https://curagenesiscrm.com/api/health

---

## ✅ Agent/Rep User Tests

### Authentication & Access
- [ ] Agent can sign in with credentials
- [ ] Session persists across page refreshes
- [ ] Logout works properly

### Navigation (Visible to Agent)
- [ ] ✅ Dashboard - Visible
- [ ] ✅ Intake - Visible
- [ ] ✅ Submissions - Visible
- [ ] ✅ Documents - Visible
- [ ] ❌ Recruit - Hidden
- [ ] ❌ Reps - Hidden
- [ ] ❌ Vendors - Hidden
- [ ] ❌ Admin - Hidden

### Intake CRM
- [ ] Can create new practice account
- [ ] Required fields validated (practice name, specialty, contact info)
- [ ] Can add ≥1 contact to practice
- [ ] Send to CuraGenesis button works
- [ ] Success/Failed states visible after submission
- [ ] Back button returns to dashboard

### Submissions
- [ ] Can see their own submissions
- [ ] Cannot see other reps' submissions
- [ ] Status column shows PENDING/SUCCESS/FAILED
- [ ] Can view submission details
- [ ] Error messages displayed when submission fails
- [ ] Back button returns to dashboard

### Documents
- [ ] Onboarding status visible
- [ ] BAA status shows (Pending/Signed)
- [ ] W-9 status shows (Pending/Signed)
- [ ] Can download signed documents when available
- [ ] Onboarding blocker works (redirects to /onboard if not complete)
- [ ] Back button returns to dashboard

### Access Control
- [ ] Navigating to /admin/* → 403 Forbidden
- [ ] Navigating to /admin/vendors → 403 Forbidden
- [ ] Navigating to /admin/reps → 403 Forbidden
- [ ] Cannot access other agents' accounts

### Account Reactivation
- [ ] Can see "Reactivate" button on their own dormant/closed accounts
- [ ] Cannot see "Reactivate" on other agents' accounts
- [ ] Reactivation creates activity log
- [ ] Optional note field available

---

## ✅ Admin User Tests

### Authentication & Access
- [x] Admin can sign in (admin@curagenesis.com / Money100!)
- [x] Session persists
- [x] All admin features accessible

### Navigation (All Visible to Admin)
- [x] ✅ Dashboard - Visible
- [x] ✅ Intake - Visible
- [x] ✅ Submissions - Visible
- [x] ✅ Documents - Visible
- [x] ✅ Recruit - Visible
- [x] ✅ Reps - Visible
- [x] ✅ Vendors - Visible
- [x] ✅ Admin - Visible

### Rep Management (Recruit Tab)
- [ ] Can create single rep (first name, last name, personal email)
- [ ] Corp email auto-generates (jdoe@curagenesis.com format)
- [ ] Temp mailbox password generated and logged
- [ ] CRM temp password generated and logged
- [ ] Invite link created and logged
- [ ] Can bulk upload CSV with reps
- [ ] CSV shows per-row status (invited/exists/error)

### Rep Administration (Reps Tab)
- [ ] List shows Active/Inactive filter
- [ ] Can view individual rep details
- [ ] Can deactivate rep (with optional reason)
- [ ] Cannot deactivate last admin (shows error)
- [ ] Can reactivate rep (clears suspension reason)
- [ ] Rep metrics visible (total sales, profit, active accounts)
- [ ] Rep documents visible (BAA/W-9 status)
- [ ] Suspension reason displayed when inactive
- [ ] Back button returns to dashboard
- [ ] Rep detail back button returns to reps list

### Vendor Management (Vendors Tab)
- [ ] Can create vendor (name, contact, email, phone)
- [ ] Can edit vendor information
- [ ] Can delete vendor
- [ ] Can add products to vendor
- [ ] Products have: name, SKU, unit price, category
- [ ] Can edit product pricing
- [ ] Can delete products
- [ ] Back button returns to dashboard
- [ ] Vendor detail back button returns to vendors list

### Financial Data (Admin-Only)
- [ ] Dashboard shows COGS data (not visible to agents)
- [ ] Gross margin percentage visible
- [ ] Can query CuraGenesis Financials API
- [ ] Financial metrics include commission data
- [ ] Profit calculations shown
- [ ] COGS never leaked to rep role

### KPI Dashboard
- [ ] Overview tab loads with real data
- [ ] Segments tab shows geographic/specialty breakdown
- [ ] Team tab shows rep leaderboard
- [ ] Practices tab shows sync button
- [ ] Practice sync works (pulls from CuraGenesis)
- [ ] All 45 practices saved to database
- [ ] Metrics update after sync

### Account Reactivation
- [ ] Can reactivate any dormant/closed practice
- [ ] Cannot reactivate already-active account (shows error)
- [ ] Activity log created on reactivation
- [ ] Optional note field available

### RBAC & Security
- [ ] Cannot elevate role via client manipulation
- [ ] All `/api/admin/*` routes require `requireAdmin()`
- [ ] All `/api/reps/*` routes require `requireAdmin()`
- [ ] All `/api/recruiter/*` routes require `requireRecruiter()`
- [ ] Agents cannot access `/api/financials`

---

## ✅ Platform & Reliability Tests

### Environment Variables
- [x] ✅ DATABASE_URL present and non-empty
- [x] ✅ CURAGENESIS_VENDOR_TOKEN present
- [x] ✅ JWT_SECRET present
- [x] ✅ NODE_ENV=production
- [ ] ✅ No private keys in client bundle

### Database
- [x] ✅ Prisma migrations deployed
- [x] ✅ Schema enums matched (AccountStatus, OnboardStatus, Role)
- [x] ✅ All required columns exist
- [x] ✅ Foreign keys validated
- [ ] ✅ Indexes present on frequently queried columns

### API Routes
- [x] ✅ All routes return JSON
- [x] ✅ Errors include descriptive messages
- [x] ✅ Status codes appropriate (401, 403, 404, 500)
- [x] ✅ Try/catch blocks on all routes
- [ ] ✅ `export const dynamic = 'force-dynamic'` on routes

### Health & Monitoring
- [x] ✅ `/api/health` responds
- [x] ✅ `/api/health/detailed` shows comprehensive status
- [x] ✅ `/api/admin/monitoring` available
- [x] ✅ Logs emit request IDs
- [x] ✅ Errors logged to CloudWatch

### Security
- [ ] ✅ Passwords hashed (PBKDF2)
- [ ] ✅ JWT tokens in HTTP-only cookies
- [ ] ✅ CORS configured properly
- [ ] ✅ No SQL injection vulnerabilities (using Prisma)
- [ ] ✅ XSS protection (React escapes by default)

---

## 🧪 Quick Verification Commands

```bash
# Test health
curl https://curagenesiscrm.com/api/health

# Test admin login
curl -X POST https://curagenesiscrm.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@curagenesis.com","password":"Money100!"}'

# Test practice sync
curl -X POST https://curagenesiscrm.com/api/kpi/sync-practices \
  -H "Cookie: auth-token=<JWT>"

# Check database
psql "postgresql://crmuser:CuraGenCRM_Master_2024!@cura-genesis-crm-db.c6ds4c4qok1n.us-east-1.rds.amazonaws.com:5432/curagenesis_intake_crm" \
  -c "SELECT COUNT(*) FROM accounts;"

# View logs
aws logs tail /ecs/curagenesis-crm --since 5m --region us-east-1
```

---

## 📊 Current Status:

### ✅ Verified Working:
- Authentication system
- Practice sync (45 practices saved)
- Dashboard with real data
- Role-based navigation
- Database connectivity
- CuraGenesis API integration
- Financials API integration

### 🔄 Just Deployed:
- Back buttons on all pages
- Defensive error handling
- Better console logging
- Auth cookie fixes

### ⏳ To Test:
- Agent user flow (need to create an agent)
- Rep reactivation with reason
- Account reactivation with notes
- Bulk invite functionality
- Document signing workflow

---

**System is ready for comprehensive testing!** Once the deployment completes, please test the features and report any issues you find.
