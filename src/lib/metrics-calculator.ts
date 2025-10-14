// ============================================================================
// METRICS CALCULATOR - Calculate KPIs from DynamoDB data
// ============================================================================

import {
  getAllFacilities,
  getAllOrders,
  getAllReps,
  getFacilitiesByRep,
  getOrdersByUser,
  type BAADataItem,
  type OrderMedicalItem,
  type RepItem,
} from "./dynamodb-client";

export type DateRange = "30d" | "60d" | "90d";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function isWithinDateRange(dateString: string | undefined, dateRange: DateRange): boolean {
  if (!dateString) return false;
  
  const days = dateRange === "30d" ? 30 : dateRange === "60d" ? 60 : 90;
  const cutoffDate = getDaysAgo(days);
  const itemDate = new Date(dateString);
  
  return itemDate >= cutoffDate;
}

function calculateOrderTotal(order: OrderMedicalItem): number {
  if (order.totalAmount) return order.totalAmount;
  
  // Calculate from grafts if available
  if (order.graftsUsed && Array.isArray(order.graftsUsed)) {
    return order.graftsUsed.reduce((sum, graft) => {
      const price = graft.price || 0;
      const quantity = graft.quantity || 0;
      return sum + (price * quantity);
    }, 0);
  }
  
  return 0;
}

// ============================================================================
// OVERVIEW METRICS
// ============================================================================

export async function calculateOverviewMetrics(dateRange: DateRange) {
  const [facilities, orders, reps] = await Promise.all([
    getAllFacilities(),
    getAllOrders(),
    getAllReps(),
  ]);

  // Filter by date range
  const recentFacilities = facilities.filter(f => isWithinDateRange(f.createdAt, dateRange));
  const recentOrders = orders.filter(o => isWithinDateRange(o.createdAt, dateRange));

  // Calculate sales metrics
  const totalSales = recentOrders.reduce((sum, order) => sum + calculateOrderTotal(order), 0);
  const totalOrders = recentOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  // Active practices (those with orders in date range)
  const activePracticeIds = new Set(recentOrders.map(o => o.userId));
  const activePractices = activePracticeIds.size;

  // Practices added in date range
  const practicesAdded = recentFacilities.length;

  // Calculate activation rate (practices that have ordered / total practices)
  const totalPractices = facilities.length;
  const activationRate = totalPractices > 0 ? activePractices / totalPractices : 0;

  // Calculate days to first order
  const practicesWithOrders = facilities.filter(f => 
    orders.some(o => o.userId === f.UserId)
  );
  
  let totalDaysToFirstOrder = 0;
  let countWithFirstOrder = 0;
  
  for (const facility of practicesWithOrders) {
    const facilityOrders = orders
      .filter(o => o.userId === facility.UserId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    if (facilityOrders.length > 0 && facility.createdAt) {
      const firstOrder = facilityOrders[0];
      const facilityCreated = new Date(facility.createdAt);
      const firstOrderDate = new Date(firstOrder.createdAt);
      const daysDiff = Math.floor((firstOrderDate.getTime() - facilityCreated.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 0) {
        totalDaysToFirstOrder += daysDiff;
        countWithFirstOrder++;
      }
    }
  }
  
  const avgDaysToFirstOrder = countWithFirstOrder > 0 ? totalDaysToFirstOrder / countWithFirstOrder : 0;

  // New vs repeat orders
  const ordersByUser = new Map<string, OrderMedicalItem[]>();
  recentOrders.forEach(order => {
    if (!ordersByUser.has(order.userId)) {
      ordersByUser.set(order.userId, []);
    }
    ordersByUser.get(order.userId)!.push(order);
  });

  let newOrders = 0;
  let repeatOrders = 0;
  
  ordersByUser.forEach(userOrders => {
    const sortedOrders = userOrders.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    sortedOrders.forEach((order, index) => {
      if (index === 0) {
        newOrders++;
      } else {
        repeatOrders++;
      }
    });
  });

  // Revenue per rep
  const revenuePerRep = reps.length > 0 ? totalSales / reps.length : 0;

  // Time series data (weekly buckets)
  const days = dateRange === "30d" ? 30 : dateRange === "60d" ? 60 : 90;
  const weeks = Math.ceil(days / 7);
  const series = [];
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = getDaysAgo(i * 7);
    const weekStart = getDaysAgo((i + 1) * 7);
    
    const weekOrders = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= weekStart && orderDate < weekEnd;
    });
    
    const weekFacilities = facilities.filter(f => {
      if (!f.createdAt) return false;
      const facilityDate = new Date(f.createdAt);
      return facilityDate >= weekStart && facilityDate < weekEnd;
    });
    
    const weekSales = weekOrders.reduce((sum, order) => sum + calculateOrderTotal(order), 0);
    const weekActivePractices = new Set(weekOrders.map(o => o.userId)).size;
    
    series.push({
      date: weekEnd.toISOString().split('T')[0],
      sales: weekSales,
      salesArea: Math.round(weekSales / 2), // Mock: assume $2 per sq cm
      orders: weekOrders.length,
      activePractices: weekActivePractices,
      practicesAdded: weekFacilities.length,
      practicesSent: weekFacilities.length, // Assume all added were sent
      newOrders: weekOrders.filter(o => {
        const userOrders = orders.filter(ord => ord.userId === o.userId);
        const sortedUserOrders = userOrders.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return sortedUserOrders[0]?.orderId === o.orderId;
      }).length,
      repeatOrders: weekOrders.filter(o => {
        const userOrders = orders.filter(ord => ord.userId === o.userId);
        const sortedUserOrders = userOrders.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return sortedUserOrders[0]?.orderId !== o.orderId;
      }).length,
    });
  }

  return {
    conversion: {
      practicesAdded,
      sendToCuraGenesisRate: 0.89, // Mock - would need submission tracking
      activationRate,
      avgDaysToFirstOrder,
      dropOffRate30d: 1 - activationRate,
    },
    sales: {
      totalSalesVolume: totalSales,
      totalSalesArea: Math.round(totalSales / 2), // Mock: assume $2 per sq cm
      averageOrderValue,
      averageOrderSize: Math.round(averageOrderValue / 2), // Mock
      ordersPerActivePractice: activePractices > 0 ? totalOrders / activePractices : 0,
      newOrders,
      repeatOrders,
      revenuePerRep,
      grossMargin: 0.68, // Mock - would need cost data
    },
    retention: {
      retention90d: 0.76, // Mock - would need complex cohort analysis
      monthlyActivePractices: activePractices,
      churnRate: 0.09, // Mock
      avgReorderInterval: 18.5, // Mock - would need order interval calculation
      lifetimeValue: averageOrderValue * 10, // Mock: estimate based on repeat rate
    },
    operational: {
      apiSuccessRate: 0.96, // Mock - would need submission tracking
      avgApiLatency: 847, // Mock
      duplicatesPrevented: 12, // Mock
      webhookAckDelay: 1200, // Mock
      totalSubmissions: practicesAdded,
      successfulSubmissions: Math.round(practicesAdded * 0.96),
      failedSubmissions: Math.round(practicesAdded * 0.04),
    },
    series,
  };
}

// ============================================================================
// GEO METRICS
// ============================================================================

export async function calculateGeoMetrics(dateRange: DateRange) {
  const [facilities, orders] = await Promise.all([
    getAllFacilities(),
    getAllOrders(),
  ]);

  const recentOrders = orders.filter(o => isWithinDateRange(o.createdAt, dateRange));

  // Group by state
  const stateData = new Map<string, { sales: number; practices: Set<string>; orders: number }>();

  recentOrders.forEach(order => {
    const facility = facilities.find(f => f.UserId === order.userId);
    const state = facility?.facilityState || "Unknown";
    
    if (!stateData.has(state)) {
      stateData.set(state, { sales: 0, practices: new Set(), orders: 0 });
    }
    
    const data = stateData.get(state)!;
    data.sales += calculateOrderTotal(order);
    data.practices.add(order.userId);
    data.orders++;
  });

  // Convert to array and sort by sales
  const topStates = Array.from(stateData.entries())
    .map(([state, data]) => ({
      state: state === "Unknown" ? "Unknown" : state,
      stateCode: state,
      sales: data.sales,
      practices: data.practices.size,
      orders: data.orders,
    }))
    .filter(item => item.stateCode !== "Unknown")
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10); // Top 10 states

  return { topStates };
}

// ============================================================================
// LEADERBOARD METRICS
// ============================================================================

export async function calculateLeaderboardMetrics(dateRange: DateRange) {
  const [facilities, orders, reps] = await Promise.all([
    getAllFacilities(),
    getAllOrders(),
    getAllReps(),
  ]);

  const recentOrders = orders.filter(o => isWithinDateRange(o.createdAt, dateRange));
  const recentFacilities = facilities.filter(f => isWithinDateRange(f.createdAt, dateRange));

  // Calculate metrics per rep
  const repMetrics = await Promise.all(
    reps.map(async (rep) => {
      const repFacilities = facilities.filter(f => f.salesRep === rep.repId);
      const repRecentFacilities = recentFacilities.filter(f => f.salesRep === rep.repId);
      
      const repFacilityIds = new Set(repFacilities.map(f => f.UserId));
      const repOrders = recentOrders.filter(o => repFacilityIds.has(o.userId));
      
      const sales = repOrders.reduce((sum, order) => sum + calculateOrderTotal(order), 0);
      const ordersCount = repOrders.length;
      const practicesAdded = repRecentFacilities.length;
      
      // Calculate activation rate
      const activePracticesCount = new Set(repOrders.map(o => o.userId)).size;
      const activationRate = repFacilities.length > 0 ? activePracticesCount / repFacilities.length : 0;
      
      const averageOrderValue = ordersCount > 0 ? sales / ordersCount : 0;

      return {
        repId: rep.repId,
        repName: `${rep.firstName} ${rep.lastName}`,
        practicesAdded,
        activationRate,
        orders: ordersCount,
        sales,
        averageOrderValue,
      };
    })
  );

  // Sort by sales and add rank
  const leaderboard = repMetrics
    .sort((a, b) => b.sales - a.sales)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return { leaderboard };
}

// ============================================================================
// SEGMENT METRICS
// ============================================================================

export async function calculateSegmentMetrics(dateRange: DateRange) {
  const [facilities, orders] = await Promise.all([
    getAllFacilities(),
    getAllOrders(),
  ]);

  const recentOrders = orders.filter(o => isWithinDateRange(o.createdAt, dateRange));

  // Mock specialty data (would need specialty field in BAAData)
  const specialties = ["Wound Care", "Orthopedics", "Podiatry", "Dermatology", "Other"];
  const bySpecialty = specialties.map(specialty => {
    // Distribute orders randomly for now
    const segmentOrders = recentOrders.filter(() => Math.random() < 0.2);
    const sales = segmentOrders.reduce((sum, order) => sum + calculateOrderTotal(order), 0);
    const practices = new Set(segmentOrders.map(o => o.userId)).size;
    
    return {
      segment: specialty,
      orders: segmentOrders.length,
      sales,
      practices,
      avgOrderValue: segmentOrders.length > 0 ? sales / segmentOrders.length : 0,
    };
  }).filter(s => s.orders > 0);

  // Mock lead source data (would need leadSource field in BAAData)
  const leadSources = ["Referral", "Conference", "Direct Outreach", "Partner"];
  const byLeadSource = leadSources.map(source => {
    const segmentOrders = recentOrders.filter(() => Math.random() < 0.25);
    const sales = segmentOrders.reduce((sum, order) => sum + calculateOrderTotal(order), 0);
    const practices = new Set(segmentOrders.map(o => o.userId)).size;
    
    return {
      segment: source,
      orders: segmentOrders.length,
      sales,
      practices,
      avgOrderValue: segmentOrders.length > 0 ? sales / segmentOrders.length : 0,
    };
  }).filter(s => s.orders > 0);

  return { bySpecialty, byLeadSource };
}

