import { NextRequest, NextResponse } from "next/server";
import { MetricsClient, type DateRange } from "@/lib/curagenesis-client";
import { env } from "@/lib/env";
import { z } from "zod";

const RequestSchema = z.object({
  dateRange: z.enum(["30d", "60d", "90d"]).default("30d"),
});

/**
 * POST /api/kpi/overview
 * Server-side proxy to CuraGenesis metrics API
 * Returns comprehensive KPIs organized by category
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dateRange } = RequestSchema.parse(body);

    // In production, call real CuraGenesis API
    // For demo, return comprehensive mock data structure
    
    const mockData = {
      conversion: {
        practicesAdded: 47,
        sendToCuraGenesisRate: 0.89,
        activationRate: 0.73,
        avgDaysToFirstOrder: 12.3,
        dropOffRate30d: 0.18,
      },
      sales: {
        totalSalesVolume: 1250000,
        totalSalesArea: 625000, // sq cm
        averageOrderValue: 2083,
        averageOrderSize: 1041, // sq cm
        ordersPerActivePractice: 8.2,
        newOrders: 234,
        repeatOrders: 366,
        revenuePerRep: 156250,
        grossMargin: 0.68,
      },
      retention: {
        retention90d: 0.76,
        monthlyActivePractices: 79,
        churnRate: 0.09,
        avgReorderInterval: 18.5,
        lifetimeValue: 24680,
      },
      operational: {
        apiSuccessRate: 0.96,
        avgApiLatency: 847,
        duplicatesPrevented: 12,
        webhookAckDelay: 1200,
        totalSubmissions: 421,
        successfulSubmissions: 404,
        failedSubmissions: 17,
      },
      series: [
        { date: "2025-09-07", sales: 45000, salesArea: 22500, orders: 22, activePractices: 68, practicesAdded: 3, practicesSent: 2, newOrders: 8, repeatOrders: 14 },
        { date: "2025-09-14", sales: 52000, salesArea: 26000, orders: 25, activePractices: 71, practicesAdded: 4, practicesSent: 4, newOrders: 10, repeatOrders: 15 },
        { date: "2025-09-21", sales: 48000, salesArea: 24000, orders: 23, activePractices: 73, practicesAdded: 2, practicesSent: 2, newOrders: 7, repeatOrders: 16 },
        { date: "2025-09-28", sales: 51000, salesArea: 25500, orders: 24, activePractices: 75, practicesAdded: 5, practicesSent: 5, newOrders: 9, repeatOrders: 15 },
        { date: "2025-10-05", sales: 54000, salesArea: 27000, orders: 26, activePractices: 79, practicesAdded: 6, practicesSent: 5, newOrders: 11, repeatOrders: 15 },
      ],
    };

    return NextResponse.json(mockData);
  } catch (error) {
    console.error("POST /api/kpi/overview error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", issues: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch overview metrics" },
      { status: 500 }
    );
  }
}
