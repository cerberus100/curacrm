# Authentication Troubleshooting Guide

## Current Issue: "Access Denied" After Login

### What's Happening:
You're logging in successfully, but when navigating to admin pages, you're being redirected to `/unauthorized`.

### Root Cause Analysis:

The login API is working:
- ✅ JWT token created
- ✅ Cookie set with proper flags (Secure, HttpOnly, SameSite=lax)
- ✅ User data returned

But server-side pages aren't recognizing the authentication.

---

## 🔍 Debugging Steps:

### Step 1: Check Browser Cookies
1. Open DevTools → Application → Cookies
2. Look for `auth-token` cookie on `curagenesiscrm.com`
3. Verify it exists after login
4. Check expiry is in the future

**If cookie is missing**:
- Clear all site data
- Login again
- Check if cookie appears

### Step 2: Check localStorage
1. DevTools → Application → Local Storage
2. Look for `current_user`
3. Verify it has: `{ id, name, email, role: "ADMIN" }`

**If data is wrong**:
```javascript
// In console:
localStorage.clear()
// Then login again
```

### Step 3: Test Server-Side Auth
```bash
# Get a JWT from login
TOKEN=$(curl -s -X POST https://curagenesiscrm.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@curagenesis.com","password":"Money100!"}' \
  -c - | grep auth-token | awk '{print $7}')

# Test if server can read it
curl -s https://curagenesiscrm.com/api/auth/me \
  -H "Cookie: auth-token=$TOKEN" | jq .
```

**Expected**: Should return user object  
**If fails**: Server can't decode JWT

---

## 🔧 Quick Fixes:

### Fix 1: Hard Refresh After Login
```
1. Login at https://curagenesiscrm.com/login
2. After redirect to dashboard
3. Hard refresh (Cmd+Shift+R or Ctrl+Shift+F5)
4. Try navigating to Vendors or Reps
```

### Fix 2: Clear All Site Data
```
1. DevTools → Application → Storage
2. Click "Clear site data"
3. Close DevTools
4. Go to https://curagenesiscrm.com/login
5. Login fresh
```

### Fix 3: Check Cookie Domain
The cookie must be set on `.curagenesiscrm.com` or `curagenesiscrm.com`.

In DevTools → Network → Login request → Response Headers:
```
set-cookie: auth-token=...; Path=/; Domain=curagenesiscrm.com
```

### Fix 4: Verify JWT Secret Matches
The JWT_SECRET must be the same in:
1. ECS environment variables (where token is created)
2. Runtime when token is verified

Check ECS task definition:
```bash
aws ecs describe-task-definition \
  --task-definition curagenesis-crm:7 \
  --region us-east-1 | jq '.taskDefinition.containerDefinitions[0].environment[] | select(.name=="JWT_SECRET")'
```

---

## 🐛 Common Issues:

### Issue: Cookie Not Sent to Server
**Symptoms**: Login works, but immediately get unauthorized

**Cause**: Browser security blocking cookie

**Fix**:
- Ensure you're on HTTPS (not HTTP)
- Check no mixed content warnings
- Verify SameSite=lax (not strict)

### Issue: JWT Decode Fails
**Symptoms**: Server logs show "invalid signature" or "jwt malformed"

**Cause**: JWT_SECRET mismatch or corrupted token

**Fix**:
```bash
# Verify JWT_SECRET in ECS
aws ecs describe-services --cluster curagenesis-cluster \
  --services curagenesis-crm-service-v2 --region us-east-1 \
  | jq '.services[0].taskDefinition'

# Check if JWT_SECRET is set
aws ecs describe-task-definition --task-definition curagenesis-crm:7 \
  --region us-east-1 | grep JWT_SECRET
```

### Issue: Session Expired
**Symptoms**: Was working, then suddenly unauthorized

**Cause**: JWT expired (24h lifetime)

**Fix**: Just login again

---

## 🎯 Immediate Action:

**Right now, please do this**:

1. **Open browser DevTools** (F12)
2. **Go to Console tab**
3. **Type**:
```javascript
// Check if user is in localStorage
console.log('User:', localStorage.getItem('current_user'))

// Check cookies
console.log('Cookies:', document.cookie)
```

4. **Share the output** - This will tell us exactly what's stored

5. **Then try**:
```javascript
// Clear everything
localStorage.clear()
document.cookie.split(";").forEach(c => {
  document.cookie = c.trim().split("=")[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
});
// Reload page
location.href = '/login'
```

6. **Login again** and see if it works

---

## 📊 Expected Behavior:

After successful login:
- ✅ `auth-token` cookie set
- ✅ `current_user` in localStorage
- ✅ Redirect to `/dashboard`
- ✅ Can navigate to any page
- ✅ Admin sees all menu items

When accessing admin page:
- ✅ Server reads `auth-token` cookie
- ✅ Verifies JWT
- ✅ Checks role === "ADMIN"
- ✅ Allows access

---

## 🔬 Debug Output Format:

When you check console, you should see:
```javascript
// localStorage
{
  "id": "7bb46c3e-4077-4aae-807e-f546faf497f0",
  "name": "Admin User",
  "email": "admin@curagenesis.com",
  "role": "ADMIN",
  "active": true,
  "onboardStatus": "ACTIVE"
}

// Cookies
"auth-token=eyJhbGci..."
```

If you see this data, the auth is working client-side. The issue is then server-side cookie reading.

---

**Please check your browser console and share what you see, then we can pinpoint the exact issue!**
