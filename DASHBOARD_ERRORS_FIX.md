# Dashboard Errors - Diagnosis & Fix

**Date:** October 13, 2025  
**Status:** 4 errors detected on dashboard

---

## 🚨 **Errors Found:**

### **1. KPI Fetch Error (500)**
**Endpoint:** `POST /api/kpi/segments`  
**Error:** `Failed to fetch KPI data`  
**Cause:** Database query issue - likely trying to access `orders` table that may not exist or have data

### **2. Sync Practices Error (403)**
**Endpoint:** `POST /api/kpi/sync-practices`  
**Error:** `Failed to sync practices`  
**Cause:** **Agent user trying to access admin-only endpoint**

### **3. Segments API Error (500)**
**Endpoint:** Response shows server error  
**Cause:** Same as #1 - database query failing

### **4. Practice Sync Auth Error (403)**
**Endpoint:** `/api/sync-practices` redirects to `/api/kpi/sync-practices`  
**Cause:** Agent doesn't have admin permission

---

## 🔍 **Root Causes:**

### **Problem 1: Agent Accessing Admin Endpoints**

**Current State:**
- You're logged in as **AGENT** role
- Dashboard is trying to sync practices (admin-only operation)
- Sync endpoint requires `requireAdmin()` check

**Why It's Happening:**
The dashboard component is calling admin endpoints for ALL users, not just admins.

**Fix:**
Only call sync-practices if user is admin.

---

### **Problem 2: Missing Orders/KPI Data**

**Current State:**
- KPI endpoints are querying `orders` table
- Orders table might be empty or query is failing

**Why It's Happening:**
1. No orders have been synced from CuraGenesis yet
2. The query assumes `orders` and `items` relationships exist

**Fix:**
1. Add null/empty checks in KPI queries
2. Return default/empty data instead of crashing
3. Sync practices as admin first to populate data

---

## ✅ **Quick Fixes:**

### **Fix 1: Update Dashboard to Skip Admin Calls for Agents**

**File:** `src/components/dashboard/dashboard-content.tsx`

**Change:**
```typescript
// Only sync practices if user is admin
useEffect(() => {
  if (isAdmin) {
    syncPractices(); // Only call for admins
  }
}, [isAdmin]);
```

### **Fix 2: Add Null Checks to KPI Segments**

**File:** `src/app/api/kpi/segments/route.ts`

**Change:**
```typescript
const accounts = await prisma.account.findMany({
  where: accountFilter,
  include: {
    orders: {
      include: {
        items: true
      }
    }
  }
});

// Add null check
if (!accounts || accounts.length === 0) {
  return NextResponse.json({
    bySpecialty: [],
    byLeadSource: []
  });
}
```

### **Fix 3: Return Empty Data Instead of Error**

**Change all KPI endpoints to return empty arrays instead of 500 errors when no data exists.**

---

## 🎯 **Immediate Action Plan:**

1. ✅ **Log in as ADMIN** to test dashboard properly
2. ✅ **Run practice sync** as admin to populate data
3. ✅ **Update dashboard** to not call admin endpoints for agents
4. ✅ **Add graceful fallbacks** to all KPI endpoints

---

## 📊 **What Should Agents See vs Admins:**

| Feature | Admin | Agent |
|---------|-------|-------|
| KPI Overview | ✅ All practices | ✅ Own practices only |
| Practice Sync Button | ✅ Yes | ❌ No |
| Segment Breakdown | ✅ All data | ✅ Own data only |
| Leaderboard | ✅ All reps | ❌ Not visible |
| Team Management | ✅ Yes | ❌ No |

---

## 🔧 **Next Steps:**

Want me to:
1. **Fix the dashboard to hide admin features from agents**
2. **Add null checks to KPI endpoints**
3. **Create a test login as admin** so you can see the full dashboard

Which would you like me to do first?

