// ============================================================================
// METRICS CALCULATOR - Calculate KPIs from DynamoDB data
// ============================================================================

import {
  getAllFacilities,
  getAllOrders,
  getAllReps,
  getAllUsers,
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

export async function calculateOverviewMetrics(dateRange: DateRange, repEmail?: string) {
  // If repEmail provided (agent), filter to only that rep's data
  // Otherwise (admin), get all data
  const [facilities, allOrders, reps] = await Promise.all([
    repEmail ? getFacilitiesByRep(repEmail) : getAllFacilities(),
    getAllOrders(), // We'll filter orders by facility userIds
    getAllReps(),
  ]);

  // For agents, only include orders from their facilities
  const facilityUserIds = new Set(facilities.map(f => f.UserId));
  const orders = repEmail 
    ? allOrders.filter(o => facilityUserIds.has(o.userId))
    : allOrders;

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

  // ============================================================================
  // ORDER FREQUENCY ANALYSIS
  // ============================================================================
  
  // Group orders by practice
  const practiceOrderMap = new Map<string, OrderMedicalItem[]>();
  orders.forEach(order => {
    if (!practiceOrderMap.has(order.userId)) {
      practiceOrderMap.set(order.userId, []);
    }
    practiceOrderMap.get(order.userId)!.push(order);
  });

  // Count practices with multiple orders
  let practicesWithMultipleOrders = 0;
  let totalDaysBetweenOrders = 0;
  let practicesWithCalculatedInterval = 0;
  let totalReorders = 0;

  practiceOrderMap.forEach((practiceOrders) => {
    if (practiceOrders.length >= 2) {
      practicesWithMultipleOrders++;
      totalReorders += practiceOrders.length - 1; // All orders after first are reorders

      // Sort by date
      const sortedOrders = practiceOrders.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Calculate days between first and second order
      const firstOrderDate = new Date(sortedOrders[0].createdAt);
      const secondOrderDate = new Date(sortedOrders[1].createdAt);
      const daysDiff = Math.floor(
        (secondOrderDate.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff >= 0) {
        totalDaysBetweenOrders += daysDiff;
        practicesWithCalculatedInterval++;
      }
    }
  });

  const practicesWithMultipleOrdersPercent = totalPractices > 0 
    ? practicesWithMultipleOrders / totalPractices 
    : 0;

  const reorderRate = practicesWithOrders.length > 0 
    ? practicesWithMultipleOrders / practicesWithOrders.length 
    : 0;

  const avgDaysBetweenOrders = practicesWithCalculatedInterval > 0 
    ? totalDaysBetweenOrders / practicesWithCalculatedInterval 
    : 0;

  // ============================================================================
  // PAYMENT METRICS
  // ============================================================================
  
  const paidOrders = orders.filter(o => o.paid === true).length;
  const unpaidOrders = orders.length - paidOrders;
  const paymentRate = orders.length > 0 ? paidOrders / orders.length : 0;

  // ============================================================================
  // ONBOARDING FUNNEL METRICS
  // ============================================================================
  
  const [users] = await Promise.all([
    getAllUsers(),
  ]);

  const totalUsers = users.length;
  const baaSignedCount = users.filter(u => u.baaSigned === true).length;
  const paSignedCount = users.filter(u => u.paSigned === true).length;
  
  const baaSignedPercent = totalUsers > 0 ? baaSignedCount / totalUsers : 0;
  const paSignedPercent = totalUsers > 0 ? paSignedCount / totalUsers : 0;

  // ============================================================================
  // END PAYMENT & ONBOARDING ANALYSIS
  // ============================================================================

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
      sendToCuraGenesisRate: totalPractices > 0 ? 0.89 : 0, // Mock - only show if there's data
      activationRate,
      avgDaysToFirstOrder,
      dropOffRate30d: practicesAdded > 0 ? (1 - activationRate) : 0,
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
    },
    retention: {
      retention90d: totalPractices > 0 ? 0.76 : 0, // Mock - only show if there's data
      monthlyActivePractices: activePractices,
      churnRate: totalPractices > 0 ? 0.09 : 0, // Mock - only show if there's data
      avgReorderInterval: avgDaysBetweenOrders, // REAL: calculated from order intervals
      lifetimeValue: totalOrders > 0 ? (averageOrderValue * 10) : 0, // Mock: estimate based on repeat rate
    },
    orderFrequency: {
      practicesWithMultipleOrders,
      practicesWithMultipleOrdersPercent,
      reorderRate,
      avgDaysBetweenOrders,
      totalReorders,
    },
    payment: {
      paidOrders,
      unpaidOrders,
      paymentRate,
      totalOrders: orders.length,
    },
    onboarding: {
      totalUsers,
      baaSignedCount,
      paSignedCount,
      baaSignedPercent,
      paSignedPercent,
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

export async function calculateGeoMetrics(dateRange: DateRange, repEmail?: string) {
  // If repEmail provided (agent), filter to only that rep's data
  // Otherwise (admin), get all data
  const [facilities, allOrders] = await Promise.all([
    repEmail ? getFacilitiesByRep(repEmail) : getAllFacilities(),
    getAllOrders(),
  ]);

  // For agents, only include orders from their facilities
  const facilityUserIds = new Set(facilities.map(f => f.UserId));
  const orders = repEmail 
    ? allOrders.filter(o => facilityUserIds.has(o.userId))
    : allOrders;

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

      // REP EFFICIENCY METRICS
      const revenuePerPractice = repFacilities.length > 0 ? sales / repFacilities.length : 0;
      const practicesWithOrders = activePracticesCount;
      
      // Calculate avg days to first order for this rep's practices
      let repTotalDaysToFirstOrder = 0;
      let repCountWithFirstOrder = 0;
      
      repFacilities.forEach(facility => {
        const facilityOrders = orders
          .filter(o => o.userId === facility.UserId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        if (facilityOrders.length > 0 && facility.createdAt) {
          const firstOrder = facilityOrders[0];
          const facilityCreated = new Date(facility.createdAt);
          const firstOrderDate = new Date(firstOrder.createdAt);
          const daysDiff = Math.floor((firstOrderDate.getTime() - facilityCreated.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff >= 0) {
            repTotalDaysToFirstOrder += daysDiff;
            repCountWithFirstOrder++;
          }
        }
      });
      
      const avgDaysToFirstOrder = repCountWithFirstOrder > 0 
        ? repTotalDaysToFirstOrder / repCountWithFirstOrder 
        : 0;

      return {
        repId: rep.repId,
        repName: `${rep.firstName} ${rep.lastName}`,
        territory: rep.territory || "N/A",
        practicesAdded,
        practicesWithOrders,
        activationRate,
        orders: ordersCount,
        sales,
        averageOrderValue,
        revenuePerPractice,
        avgDaysToFirstOrder,
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

export async function calculateSegmentMetrics(dateRange: DateRange, repEmail?: string) {
  // If repEmail provided (agent), filter to only that rep's data
  // Otherwise (admin), get all data
  const [facilities, allOrders] = await Promise.all([
    repEmail ? getFacilitiesByRep(repEmail) : getAllFacilities(),
    getAllOrders(),
  ]);

  // For agents, only include orders from their facilities
  const facilityUserIds = new Set(facilities.map(f => f.UserId));
  const orders = repEmail 
    ? allOrders.filter(o => facilityUserIds.has(o.userId))
    : allOrders;

  const recentOrders = orders.filter(o => isWithinDateRange(o.createdAt, dateRange));

  // Build quick lookup for facility by userId
  const facilityByUserId = new Map<string, BAADataItem>();
  facilities.forEach(f => {
    facilityByUserId.set(f.UserId, f);
  });

  // Group orders by specialty and lead source derived from facility metadata
  type SegmentAgg = { sales: number; orders: number; practices: Set<string> };
  const specialtyAgg = new Map<string, SegmentAgg>();
  const leadSourceAgg = new Map<string, SegmentAgg>();

  recentOrders.forEach(order => {
    const facility = facilityByUserId.get(order.userId);
    const specialty = (facility?.specialty?.trim() || "Unspecified");
    const leadSource = (facility?.leadSource?.trim() || "Unspecified");
    const orderTotal = calculateOrderTotal(order);

    // Specialty
    if (!specialtyAgg.has(specialty)) {
      specialtyAgg.set(specialty, { sales: 0, orders: 0, practices: new Set() });
    }
    const sAgg = specialtyAgg.get(specialty)!;
    sAgg.sales += orderTotal;
    sAgg.orders += 1;
    sAgg.practices.add(order.userId);

    // Lead Source
    if (!leadSourceAgg.has(leadSource)) {
      leadSourceAgg.set(leadSource, { sales: 0, orders: 0, practices: new Set() });
    }
    const lAgg = leadSourceAgg.get(leadSource)!;
    lAgg.sales += orderTotal;
    lAgg.orders += 1;
    lAgg.practices.add(order.userId);
  });

  const bySpecialty = Array.from(specialtyAgg.entries())
    .map(([segment, agg]) => ({
      segment,
      orders: agg.orders,
      sales: agg.sales,
      practices: agg.practices.size,
      avgOrderValue: agg.orders > 0 ? agg.sales / agg.orders : 0,
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 12); // cap to top 12

  const byLeadSource = Array.from(leadSourceAgg.entries())
    .map(([segment, agg]) => ({
      segment,
      orders: agg.orders,
      sales: agg.sales,
      practices: agg.practices.size,
      avgOrderValue: agg.orders > 0 ? agg.sales / agg.orders : 0,
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 12);

  return { bySpecialty, byLeadSource };
}

// ============================================================================
// TERRITORY PERFORMANCE METRICS
// ============================================================================

export async function calculateTerritoryMetrics(dateRange: DateRange, repEmail?: string) {
  // If repEmail provided (agent), filter to only that rep's data
  // Otherwise (admin), get all data
  const [facilities, allOrders, reps] = await Promise.all([
    repEmail ? getFacilitiesByRep(repEmail) : getAllFacilities(),
    getAllOrders(),
    getAllReps(),
  ]);

  // For agents, only include orders from their facilities
  const facilityUserIds = new Set(facilities.map(f => f.UserId));
  const orders = repEmail 
    ? allOrders.filter(o => facilityUserIds.has(o.userId))
    : allOrders;

  const recentOrders = orders.filter(o => isWithinDateRange(o.createdAt, dateRange));

  // Group reps by territory
  const territoryMap = new Map<string, RepItem[]>();
  reps.forEach(rep => {
    const territory = rep.territory || "Unassigned";
    if (!territoryMap.has(territory)) {
      territoryMap.set(territory, []);
    }
    territoryMap.get(territory)!.push(rep);
  });

  // Calculate metrics per territory
  const territoryMetrics = Array.from(territoryMap.entries()).map(([territory, territoryReps]) => {
    const repIds = new Set(territoryReps.map(r => r.repId));
    
    // Get all practices from reps in this territory
    const territoryFacilities = facilities.filter(f => f.salesRep && repIds.has(f.salesRep));
    const territoryFacilityIds = new Set(territoryFacilities.map(f => f.UserId));
    
    // Get orders from those practices
    const territoryOrders = recentOrders.filter(o => territoryFacilityIds.has(o.userId));
    
    // Calculate metrics
    const sales = territoryOrders.reduce((sum, order) => sum + calculateOrderTotal(order), 0);
    const ordersCount = territoryOrders.length;
    const practicesCount = territoryFacilities.length;
    const repsCount = territoryReps.length;
    
    const activePracticesCount = new Set(territoryOrders.map(o => o.userId)).size;
    const activationRate = practicesCount > 0 ? activePracticesCount / practicesCount : 0;
    
    const revenuePerRep = repsCount > 0 ? sales / repsCount : 0;
    const revenuePerPractice = practicesCount > 0 ? sales / practicesCount : 0;
    const avgOrderValue = ordersCount > 0 ? sales / ordersCount : 0;

    return {
      territory,
      reps: repsCount,
      practices: practicesCount,
      practicesWithOrders: activePracticesCount,
      orders: ordersCount,
      sales,
      activationRate,
      revenuePerRep,
      revenuePerPractice,
      avgOrderValue,
    };
  });

  // Sort by sales descending
  const territories = territoryMetrics.sort((a, b) => b.sales - a.sales);

  return { territories };
}

