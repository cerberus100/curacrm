# 🌐 Custom Domain Setup for CuraGenesis CRM

## What CuraGenesis Needs to Know

---

## 📍 **Current Status Check**

### **Is the app deployed to AWS Amplify yet?**

#### ✅ **Option A: If Already Deployed**

**Your Amplify App URL is something like:**
```
https://main.d1234abcd5678.amplifyapp.com
```

**Tell CuraGenesis:**
> "Our application is deployed at: `https://[your-amplify-url].amplifyapp.com`
> 
> To point `curagenesis.com/login` to our app, you'll need to set up a reverse proxy or subdomain redirect."

---

#### ❌ **Option B: If NOT Deployed Yet**

**Tell CuraGenesis:**
> "We'll be deploying to AWS Amplify soon. Once deployed, we'll provide you with:
> 1. The Amplify domain (for proxy setup), OR
> 2. Instructions for custom domain configuration (if you want to use your domain directly)"

---

## 🎯 **Two Deployment Approaches**

### **Approach 1: Subdomain (RECOMMENDED)**

**Host the CRM at:** `crm.curagenesis.com` or `sales.curagenesis.com`

**Why this is better:**
- ✅ Cleaner separation of concerns
- ✅ Easier SSL certificate management
- ✅ No path routing complexity
- ✅ Better for Next.js App Router
- ✅ You control the subdomain directly

**What CuraGenesis needs to do:**
1. Create a DNS CNAME record:
   ```
   crm.curagenesis.com  →  [your-amplify-url].amplifyapp.com
   ```

2. Add custom domain in Amplify:
   - Go to Amplify Console
   - App Settings > Domain Management
   - Add domain: `crm.curagenesis.com`
   - Amplify will provide DNS records to add

**End Result:**
- Your CRM: `https://crm.curagenesis.com`
- Login page: `https://crm.curagenesis.com/login`

---

### **Approach 2: Subdirectory (More Complex)**

**Host the CRM at:** `curagenesis.com/crm` or `curagenesis.com/sales`

**Why this is harder:**
- ⚠️ Requires reverse proxy configuration
- ⚠️ Path rewriting complexity
- ⚠️ May break Next.js assets
- ⚠️ CuraGenesis IT team needs to configure

**What CuraGenesis needs to do:**
1. Set up reverse proxy (NGINX/CloudFront/etc.) to route:
   ```
   curagenesis.com/crm/*  →  [your-amplify-url].amplifyapp.com/*
   ```

2. Configure path rewriting to strip `/crm` prefix

3. Handle SSL/HTTPS properly

**End Result:**
- Your CRM: `https://curagenesis.com/crm`
- Login page: `https://curagenesis.com/crm/login`

---

## 🔧 **Recommended Setup Steps**

### **Step 1: Deploy to Amplify**

```bash
# 1. Push code to GitHub
git push origin main

# 2. Create Amplify App
# Go to: https://console.aws.amazon.com/amplify
# - Connect to GitHub repo: cerberus100/curacrm
# - Select branch: main
# - Amplify will auto-detect Next.js and use amplify.yml

# 3. Wait for deployment (~5 minutes)
# You'll get a URL like: https://main.d123456789abc.amplifyapp.com
```

---

### **Step 2: Tell CuraGenesis Your Amplify URL**

**Copy your Amplify URL from the Amplify Console and send:**

```
Email to CuraGenesis IT Team:
────────────────────────────────

Subject: CRM Deployment - Custom Domain Setup

Hi [IT Team],

Our sales CRM is now deployed and ready for custom domain setup.

AMPLIFY URL: https://main.d123456789abc.amplifyapp.com

RECOMMENDED APPROACH: Subdomain
• Host CRM at: crm.curagenesis.com (or sales.curagenesis.com)
• Login URL: https://crm.curagenesis.com/login

DNS SETUP NEEDED:
Please create a CNAME record:
• Name: crm
• Type: CNAME
• Value: main.d123456789abc.amplifyapp.com
• TTL: 300

After you create the DNS record, let me know and I'll:
1. Add the custom domain in AWS Amplify
2. Configure SSL certificate (automatic via AWS Certificate Manager)
3. Verify DNS propagation

Timeline: ~15 minutes after DNS record is created

Questions? Let me know!

Thanks,
[Your Name]
```

---

### **Step 3: Configure Custom Domain in Amplify**

Once CuraGenesis creates the DNS record:

```bash
# Go to AWS Amplify Console
1. Open your app
2. Go to: App Settings > Domain Management
3. Click "Add domain"
4. Enter: crm.curagenesis.com
5. Click "Configure domain"

# Amplify will:
• Request SSL certificate from ACM (automatic)
• Verify domain ownership via DNS
• Configure CloudFront distribution
• Provide final DNS records for CuraGenesis

# Wait 5-15 minutes for:
• SSL certificate issuance
• DNS propagation
• CDN configuration
```

---

## 📧 **What to Send to CuraGenesis Right Now**

### **Scenario 1: App Already Deployed**

```
Subject: CRM Custom Domain - Need DNS Configuration

Hi [Name],

Our sales CRM is deployed and ready. To set up curagenesis.com/login 
access, we recommend using a subdomain for cleaner architecture.

CURRENT URL: https://main.d123456789abc.amplifyapp.com

RECOMMENDED SETUP:
• Subdomain: crm.curagenesis.com
• Login URL: https://crm.curagenesis.com/login

NEXT STEPS:
1. Create DNS CNAME record (details below)
2. I'll configure custom domain in AWS Amplify
3. SSL certificate automatically provisioned
4. Ready in ~15 minutes

DNS RECORD NEEDED:
────────────────
Type: CNAME
Name: crm (or sales)
Value: main.d123456789abc.amplifyapp.com
TTL: 300
────────────────

Alternative: If you prefer curagenesis.com/crm (subdirectory), 
your team will need to configure a reverse proxy. Happy to discuss 
both approaches!

Let me know which approach you prefer.

Thanks,
[Your Name]
```

---

### **Scenario 2: App NOT Deployed Yet**

```
Subject: CRM Deployment - Custom Domain Planning

Hi [Name],

Our CRM is ready to deploy. Before I deploy to AWS, let's confirm 
the domain setup approach.

TWO OPTIONS:

Option A: Subdomain (RECOMMENDED)
• URL: https://crm.curagenesis.com/login
• Pros: Clean, easy, fast setup
• Your IT: Create one DNS CNAME record
• Timeline: 15 minutes after DNS record

Option B: Subdirectory (Complex)
• URL: https://curagenesis.com/crm/login
• Pros: Single domain
• Your IT: Configure reverse proxy + path rewriting
• Timeline: Depends on your infrastructure

Which approach do you prefer?

Once decided, I'll:
1. Deploy to AWS Amplify
2. Provide exact DNS records
3. Configure SSL certificate
4. Test and verify

Thanks,
[Your Name]
```

---

## 🔍 **Technical Details for CuraGenesis IT Team**

### **Subdomain Approach (Recommended)**

**Architecture:**
```
User Request: https://crm.curagenesis.com/login
      ↓
DNS CNAME: crm.curagenesis.com → d123456.amplifyapp.com
      ↓
CloudFront CDN (Amplify)
      ↓
Next.js App (SSR/ISR)
      ↓
Response: CRM Login Page
```

**DNS Configuration:**
```dns
; Add to curagenesis.com zone
crm.curagenesis.com.  300  IN  CNAME  main.d123456789abc.amplifyapp.com.
```

**SSL Certificate:**
- Automatic via AWS Certificate Manager (ACM)
- Managed by Amplify
- Auto-renewal
- No cost

---

### **Subdirectory Approach (Complex)**

**Architecture:**
```
User Request: https://curagenesis.com/crm/login
      ↓
Your Web Server (NGINX/Apache/CloudFront)
      ↓
Reverse Proxy Rule:
  IF path starts with /crm
  THEN proxy to d123456.amplifyapp.com
  AND rewrite path (remove /crm prefix)
      ↓
Next.js App
      ↓
Response: CRM Login Page
```

**NGINX Configuration Example:**
```nginx
location /crm/ {
    proxy_pass https://main.d123456789abc.amplifyapp.com/;
    proxy_set_header Host main.d123456789abc.amplifyapp.com;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Rewrite paths
    rewrite ^/crm/(.*)$ /$1 break;
}
```

**Challenges:**
- Next.js asset paths may need `basePath` configuration
- API routes need path prefix handling
- More complex to maintain
- Higher latency (extra proxy hop)

---

## 🎯 **Summary: What You Need to Provide**

### **Right Now (Before Deployment):**

Tell CuraGenesis:
> "I'm about to deploy to AWS Amplify. Do you prefer:
> 
> **A) Subdomain:** `crm.curagenesis.com` (15 min setup), OR
> **B) Subdirectory:** `curagenesis.com/crm` (requires reverse proxy)
> 
> I recommend Option A for simplicity and performance."

---

### **After Deployment:**

Provide CuraGenesis:
```
1. Amplify URL: https://main.d123456789abc.amplifyapp.com
2. Requested subdomain: crm.curagenesis.com
3. DNS record needed:
   Type: CNAME
   Name: crm
   Value: main.d123456789abc.amplifyapp.com
   TTL: 300
```

---

## 📞 **Next Steps**

1. **Ask CuraGenesis:** "Subdomain or subdirectory?"
2. **Deploy to Amplify** (if you haven't already)
3. **Get your Amplify URL** from the Amplify Console
4. **Send them the DNS record** they need to create
5. **Configure custom domain** in Amplify once DNS is set
6. **Verify** everything works

---

## ⚡ **Quick Deploy Command**

If you haven't deployed yet:

```bash
# 1. Ensure code is pushed to GitHub
git push origin main

# 2. Go to Amplify Console:
https://console.aws.amazon.com/amplify

# 3. Click "New app" > "Host web app"
# 4. Connect GitHub repo: cerberus100/curacrm
# 5. Select branch: main
# 6. Amplify auto-detects Next.js settings
# 7. Click "Save and deploy"

# Wait ~5 minutes, then copy your Amplify URL
```

---

## 🆘 **Common Questions**

### **Q: What if they want curagenesis.com/login exactly?**
**A:** That means your app would be at the root path. They'd need to:
- Point their entire domain to your Amplify app, OR
- Use a sophisticated reverse proxy with path-based routing

This is uncommon and complex. **Recommend subdomain instead.**

---

### **Q: Can we use their SSL certificate?**
**A:** If using subdomain with Amplify custom domain, AWS Certificate Manager handles SSL automatically (free). If they insist on their own cert, they'd need to set up the reverse proxy approach.

---

### **Q: How long does custom domain setup take?**
**A:**
- DNS record creation: 5 minutes (their IT team)
- SSL certificate issuance: 5-10 minutes (automatic)
- DNS propagation: 5-60 minutes (varies by TTL)
- **Total: ~15-60 minutes**

---

### **Q: What if they don't have AWS?**
**A:** They don't need AWS! They just need to create a DNS CNAME record pointing to your Amplify URL. You handle all the AWS infrastructure.

---

**Need help with the actual deployment or DNS setup? Let me know!** 🚀

