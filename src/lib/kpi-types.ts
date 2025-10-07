// ============================================================================
// COMPREHENSIVE KPI TYPE DEFINITIONS
// ============================================================================

export type DateRange = "30d" | "60d" | "90d";

// ============================================================================
// 1. CORE CONVERSION KPIs (Rep / Practice Funnel)
// ============================================================================

export interface ConversionKPIs {
  practicesAdded: number;
  sendToCuraGenesisRate: number; // % of intakes successfully submitted
  activationRate: number; // % of sent practices with ≥1 order
  avgDaysToFirstOrder: number;
  dropOffRate30d: number; // accounts sent but no orders after 30 days
}

// ============================================================================
// 2. SALES PERFORMANCE KPIs
// ============================================================================

export interface SalesPerformanceKPIs {
  totalSalesVolume: number; // USD
  totalSalesArea: number; // sq cm (tissue/allograft)
  averageOrderValue: number; // AOV in USD
  averageOrderSize: number; // sq cm per order
  ordersPerActivePractice: number;
  newOrders: number;
  repeatOrders: number;
  revenuePerRep: number; // USD per rep
  grossMargin: number; // % (if cost data available)
}

// ============================================================================
// 3. RETENTION & GROWTH KPIs
// ============================================================================

export interface RetentionKPIs {
  retention90d: number; // % ordering ≥2 times in 90 days
  monthlyActivePractices: number; // MAP
  churnRate: number; // % active last month but 0 orders this month
  avgReorderInterval: number; // days between orders
  lifetimeValue: number; // LTV estimate
}

// ============================================================================
// 4. GEOGRAPHIC / SEGMENT KPIs
// ============================================================================

export interface GeographicKPI {
  state: string;
  stateCode: string;
  orders: number;
  sales: number; // USD
  practices: number;
  avgOrderValue: number;
}

export interface SegmentKPI {
  segment: string; // specialty or lead_source
  orders: number;
  sales: number;
  practices: number;
  avgOrderValue: number;
}

// ============================================================================
// 5. REP & TEAM PRODUCTIVITY KPIs
// ============================================================================

export interface RepProductivityKPI {
  repId: string;
  repName: string;
  accountsAddedPerWeek: number;
  avgResponseTime: number; // hours between creation → send
  errorRate: number; // % failed submissions
  followUpCompliance: number; // % with follow-up logged
  practicesAdded: number;
  activationRate: number;
  orders: number;
  sales: number;
  averageOrderValue: number;
  rank: number;
}

// ============================================================================
// 6. OPERATIONAL & API KPIs
// ============================================================================

export interface OperationalKPIs {
  apiSuccessRate: number; // % successful POSTs
  avgApiLatency: number; // ms
  duplicatesPrevented: number;
  webhookAckDelay: number; // ms (avg)
  totalSubmissions: number;
  successfulSubmissions: number;
  failedSubmissions: number;
}

// ============================================================================
// 7. FINANCIAL PIPELINE KPIs (optional future)
// ============================================================================

export interface FinancialKPIs {
  commissionableRevenue: number; // USD
  avgCommissionRate: number; // %
  avgPaymentDelay: number; // days from order to payment
}

// ============================================================================
// TIME SERIES DATA
// ============================================================================

export interface TimeSeriesPoint {
  date: string; // ISO date
  sales: number;
  salesArea: number; // sq cm
  orders: number;
  activePractices: number;
  practicesAdded: number;
  practicesSent: number;
  newOrders: number;
  repeatOrders: number;
}

// ============================================================================
// COMPLETE OVERVIEW RESPONSE
// ============================================================================

export interface ComprehensiveOverview {
  conversion: ConversionKPIs;
  sales: SalesPerformanceKPIs;
  retention: RetentionKPIs;
  operational: OperationalKPIs;
  financial?: FinancialKPIs; // Optional
  series: TimeSeriesPoint[];
}

// ============================================================================
// GEO & SEGMENT RESPONSES
// ============================================================================

export interface GeoResponse {
  topStates: GeographicKPI[];
  totalStates: number;
}

export interface SegmentResponse {
  bySpecialty: SegmentKPI[];
  byLeadSource: SegmentKPI[];
}

// ============================================================================
// LEADERBOARD RESPONSE
// ============================================================================

export interface LeaderboardResponse {
  leaderboard: RepProductivityKPI[];
  totalReps: number;
}
