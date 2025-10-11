/**
 * CuraGenesis Partner Financials API Client
 * Fetches order financials including COGS, commission, profit margins
 */

import { env } from "./env";

const BASE_URL = "https://sr9bkv1k3k.execute-api.us-east-1.amazonaws.com/Admin-Prod/api/partner/v1";

export interface FinancialLineItem {
  qCode: string;
  quantity: number;
  size: string | null;
  areaMult: number;
  qty_units: number;
  source: "order" | "invoice";
}

export interface RepInfo {
  repId: string;
  commissionRatePct: number;
  email: string;
  name: string;
  status: string;
  territory: string;
}

export interface OrderFinancial {
  order_id: string;
  practice_id: string | null;
  rep_id: string | null;
  
  cost_of_goods: number;
  commission_amount: number;
  
  invoice_total_due: number | null;
  invoice_base_total: number | null;
  invoice_early_pay_total: number;
  invoice_discount_pct: number;
  invoice_eligible_for_discount: boolean;
  
  onTimeProfit: number;
  onTimeProfitNet60: number;
  pastDueProfit: number;
  pastDueProfitNet60: number;
  
  order_date: string | null;
  order_date_epoch_ms: number | null;
  invoice_id: string | null;
  invoice_due_date: string | null;
  invoice_due_date_epoch_ms: number | null;
  paid: boolean | null;
  total_amount: number;
  
  calc_details?: {
    lines: FinancialLineItem[];
    rep: RepInfo | null;
    profits: {
      onTimeProfit: number;
      onTimeProfitNet60: number;
      pastDueProfit: number;
      pastDueProfitNet60: number;
    };
    cog_totals: {
      upfrontCOG: number;
      net60COG: number;
      net60COGDown: number;
    };
  };
}

export interface FinancialsResponse {
  items: OrderFinancial[];
  nextCursor: string | null;
}

export interface FinancialsQueryParams {
  // Primary filters (use exactly one)
  orderId?: string;
  invoiceId?: string;
  userId?: string;
  practiceId?: string;
  email?: string;
  repId?: string;
  rep?: string;
  
  // Optional windowing
  from?: string | number;
  to?: string | number;
  page_size?: number;
  cursor?: string;
}

export class CuraGenesisFinancialsAPI {
  private baseUrl: string;
  private vendorKey: string;

  constructor() {
    this.baseUrl = BASE_URL;
    this.vendorKey = env.CURAGENESIS_VENDOR_TOKEN || process.env.CURAGENESIS_VENDOR_TOKEN || "";
    
    if (!this.vendorKey) {
      throw new Error("CURAGENESIS_VENDOR_TOKEN is not configured");
    }
  }

  /**
   * Fetch financial data with filtering
   * Use GET or POST (POST recommended for complex queries)
   */
  async getFinancials(params: FinancialsQueryParams): Promise<FinancialsResponse> {
    const url = new URL(`${this.baseUrl}/financials`);
    
    // For simple queries, use GET with query params
    // For complex queries or to avoid URL length issues, use POST
    const usePost = Object.keys(params).length > 3;
    
    if (!usePost) {
      // Add query parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value.toString());
        }
      });
    }
    
    const response = await fetch(usePost ? `${this.baseUrl}/financials` : url.toString(), {
      method: usePost ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-vendor-key': this.vendorKey
      },
      ...(usePost && { body: JSON.stringify(params) })
    });

    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({ error: 'UNAUTHORIZED' }));
      throw new Error(`CuraGenesis Financials API authentication failed: ${errorData.message || 'Invalid API key'}`);
    }

    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({ error: 'VALIDATION_ERROR' }));
      throw new Error(`Invalid request: ${errorData.message || 'Multiple primary filters or bad input'}`);
    }

    if (!response.ok) {
      throw new Error(`CuraGenesis Financials API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get all financials for a practice (with pagination)
   */
  async getPracticeFinancials(practiceId: string, from?: string, to?: string): Promise<OrderFinancial[]> {
    let allItems: OrderFinancial[] = [];
    let cursor: string | null = null;
    
    do {
      const response = await this.getFinancials({
        practiceId,
        from,
        to,
        page_size: 200,
        ...(cursor && { cursor })
      });
      
      allItems = allItems.concat(response.items);
      cursor = response.nextCursor;
    } while (cursor);
    
    return allItems;
  }

  /**
   * Get all financials for a rep (with pagination)
   */
  async getRepFinancials(repId: string, from?: string, to?: string): Promise<OrderFinancial[]> {
    let allItems: OrderFinancial[] = [];
    let cursor: string | null = null;
    
    do {
      const response = await this.getFinancials({
        repId,
        from,
        to,
        page_size: 200,
        ...(cursor && { cursor })
      });
      
      allItems = allItems.concat(response.items);
      cursor = response.nextCursor;
    } while (cursor);
    
    return allItems;
  }

  /**
   * Get financials for a single order
   */
  async getOrderFinancials(orderId: string): Promise<OrderFinancial | null> {
    const response = await this.getFinancials({ orderId });
    return response.items[0] || null;
  }

  /**
   * Calculate aggregate financial metrics
   */
  calculateAggregates(items: OrderFinancial[]) {
    const totals = items.reduce((acc, item) => {
      acc.totalRevenue += item.total_amount;
      acc.totalCOGS += item.cost_of_goods;
      acc.totalCommission += item.commission_amount;
      acc.totalOnTimeProfit += item.onTimeProfitNet60;
      acc.totalPastDueProfit += item.pastDueProfitNet60;
      acc.totalOrders += 1;
      if (item.paid) acc.paidOrders += 1;
      
      return acc;
    }, {
      totalRevenue: 0,
      totalCOGS: 0,
      totalCommission: 0,
      totalOnTimeProfit: 0,
      totalPastDueProfit: 0,
      totalOrders: 0,
      paidOrders: 0
    });
    
    const grossMargin = totals.totalRevenue > 0 
      ? ((totals.totalRevenue - totals.totalCOGS) / totals.totalRevenue) * 100 
      : 0;
    
    const netProfitAfterCommission = totals.totalOnTimeProfit - totals.totalCommission;
    
    const netMargin = totals.totalRevenue > 0
      ? (netProfitAfterCommission / totals.totalRevenue) * 100
      : 0;
    
    return {
      ...totals,
      grossMargin: Math.round(grossMargin * 100) / 100,
      netProfitAfterCommission: Math.round(netProfitAfterCommission * 100) / 100,
      netMargin: Math.round(netMargin * 100) / 100,
      avgOrderValue: totals.totalOrders > 0 ? totals.totalRevenue / totals.totalOrders : 0,
      paymentRate: totals.totalOrders > 0 ? (totals.paidOrders / totals.totalOrders) * 100 : 0
    };
  }
}
