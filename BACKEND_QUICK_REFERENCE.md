# Backend Quick Reference - Provisioning System

## 🎯 What You Need to Do

### 1. **Add Database Table**
```sql
CREATE TABLE provision_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  error TEXT,
  steps JSONB,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX provision_jobs_user_id_idx ON provision_jobs(user_id);
CREATE INDEX provision_jobs_status_idx ON provision_jobs(status);
```

### 2. **Implement 2 API Endpoints**

#### A. `POST /api/provision/run` (Process pending jobs)
- Get oldest pending job
- Create @curagenesis.com email
- Send welcome email with temp password
- Mark job as success/failed

#### B. `POST /api/esign/webhook` (Receive document events)
- Validate webhook signature
- Update document status
- If all 3 docs signed → create ProvisionJob

### 3. **Choose Email Provider**

**Option A: Google Workspace** (RECOMMENDED)
- Best for @curagenesis.com
- $6/user/month
- Setup: Service account + API access

**Option B: AWS WorkMail**
- Already in AWS
- $4/user/month
- Setup: Organization + domain verification

**Option C: Microsoft 365**
- Enterprise features
- $8/user/month
- Setup: Azure app registration

### 4. **Set Environment Variables**
```bash
# Email Provider
GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/key.json  # if Google
WORKMAIL_ORG_ID=m-xxxxx                       # if AWS
AZURE_TENANT_ID=xxx                           # if Microsoft

# AWS SES (for welcome emails)
SES_FROM_ADDRESS=no-reply@curagenesis.com
AWS_REGION=us-east-1

# Domain
CORP_EMAIL_DOMAIN=curagenesis.com
```

---

## 📧 Email Format

**Username:** `firstname.lastname@curagenesis.com`  
**If duplicate:** `firstname.lastname2@curagenesis.com`

---

## 🔄 The Flow

```
1. Rep signs all 3 docs (W-9, BAA, Hire Agreement)
   ↓
2. E-sign webhook → POST /api/esign/webhook
   ↓
3. System creates ProvisionJob (status: pending)
   ↓
4. Admin clicks "Retry Provisioning" → POST /api/provision/run
   ↓
5. System:
   - Generates firstname.lastname@curagenesis.com
   - Creates email account via Google/WorkMail/M365
   - Generates 16-char temp password
   - Sends welcome email to personal inbox
   ↓
6. Rep receives:
   Subject: "Your CuraGenesis Account is Ready"
   Body: Corp email + temp password + CRM link
   ↓
7. Rep logs in, forced to change password
```

---

## ✅ Test Checklist

- [ ] Run database migration
- [ ] Implement `/api/provision/run`
- [ ] Implement `/api/esign/webhook`
- [ ] Configure email provider (Google/WorkMail/M365)
- [ ] Set env vars in ECS
- [ ] Create test user with signed docs
- [ ] Trigger provisioning manually
- [ ] Verify email created @curagenesis.com
- [ ] Check welcome email received
- [ ] Verify status shows in CRM Hires tab

---

## 🚨 Security Requirements

✅ Temp passwords: 16+ chars, mixed case, numbers, symbols  
✅ Force password change on first login  
✅ Send credentials ONLY to personal email  
✅ Never display passwords in CRM UI  

---

## 📞 Questions?

**Full details:** `PROVISIONING_BACKEND_HANDOFF.md`  
**Frontend ready:** v16 deployed  
**Contact:** asiegel@curagenesis.com

