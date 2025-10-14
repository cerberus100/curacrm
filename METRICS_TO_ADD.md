# New Metrics Implementation Plan

## ✅ **What's Already There:**

### Leaderboard (Team tab):
- ✅ Rep name
- ✅ Practices added
- ✅ Orders count
- ✅ Sales ($)
- ✅ Activation rate
- ✅ Average order value

---

## 🎯 **What I'm Adding Now:**

### **1. Order Frequency Analysis** 🔄

**Add to Overview Metrics:**
```typescript
orderFrequency: {
  practicesWithMultipleOrders: number;        // Count
  practicesWithMultipleOrdersPercent: number; // %
  reorderRate: number;                        // % of practices that reordered
  avgDaysBetweenOrders: number;               // For practices with 2+ orders
  totalReorders: number;                      // Total repeat orders
}
```

**Calculation:**
- Loop through all practices
- Count orders per practice
- Find practices with 2+ orders
- Calculate days between first and second order
- Calculate reorder rate

---

### **2. Territory Performance** 🗺️

**New API Endpoint:** `GET /api/kpi/territory`

**Returns:**
```typescript
territories: [
  {
    territory: "Florida",           // From Reps.territory
    reps: 3,                        // Reps in this territory
    practices: 23,                  // Practices signed by reps in territory
    orders: 67,                     // Orders from those practices
    sales: 234500,                  // Total revenue
    activationRate: 0.35,           // % practices that ordered
    revenuePerRep: 78166,          // Sales / reps
    revenuePerPractice: 10195      // Sales / practices
  },
  // ... more territories
]
```

**Calculation:**
- Group reps by territory
- For each territory, get all practices from those reps
- Sum orders and sales for those practices
- Calculate metrics

---

### **3. Rep Efficiency Metrics** ⚡

**Add to Leaderboard:**
```typescript
// Already has: sales, orders, practicesAdded, activationRate
// Adding:
revenuePerPractice: number;        // sales / practicesAdded
conversionRate: number;            // activationRate (already there!)
practicesWithOrders: number;       // Count of practices that ordered
avgDaysToFirstOrder: number;       // For this rep's practices
```

**Calculation:**
- For each rep:
  - Get their practices
  - Calculate revenue / practice count
  - Calculate avg days from signup → first order
  - Count how many of their practices have ordered

---

## 📊 **Where They'll Appear:**

### **Overview Tab:**
- Add "Order Frequency" section
- Show: Reorder rate, Multi-order %, Avg days between orders

### **Team Tab (Leaderboard):**
- Add columns: Revenue/Practice, Practices w/ Orders, Avg Days to Order
- Keep existing: Rank, Name, Practices, Activation %, Orders, Sales, AOV

### **NEW Territory Tab:**
- Territory name
- Reps count
- Practices count
- Orders count
- Revenue
- Activation %
- Rev/Rep
- Rev/Practice

---

## 🚀 **Implementation Steps:**

1. ✅ Update `calculateOverviewMetrics()` - Add order frequency
2. ✅ Update `calculateLeaderboardMetrics()` - Add rep efficiency
3. ✅ Create `calculateTerritoryMetrics()` - New function
4. ✅ Create `/api/kpi/territory` endpoint
5. ✅ Update dashboard UI to show new metrics
6. ✅ Test locally
7. ✅ Deploy

---

**Ready to implement!** 🎯

