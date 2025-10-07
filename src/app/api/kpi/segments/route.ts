import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  dateRange: z.enum(["30d", "60d", "90d"]).default("30d"),
});

/**
 * POST /api/kpi/segments
 * Server-side proxy to CuraGenesis segments API
 * Returns breakdown by specialty and lead source
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dateRange } = RequestSchema.parse(body);

    // In production, this would call CuraGenesis API
    // For now, return mock data structure
    
    const mockData = {
      bySpecialty: [
        { segment: "Wound Care", orders: 145, sales: 287500, practices: 23, avgOrderValue: 1983 },
        { segment: "Orthopedics", orders: 132, sales: 264000, practices: 19, avgOrderValue: 2000 },
        { segment: "Podiatry", orders: 98, sales: 196000, practices: 16, avgOrderValue: 2000 },
        { segment: "Dermatology", orders: 76, sales: 152000, practices: 12, avgOrderValue: 2000 },
        { segment: "Other", orders: 54, sales: 108000, practices: 9, avgOrderValue: 2000 },
      ],
      byLeadSource: [
        { segment: "Referral", orders: 187, sales: 374000, practices: 28, avgOrderValue: 2000 },
        { segment: "Conference", orders: 143, sales: 286000, practices: 21, avgOrderValue: 2000 },
        { segment: "Direct Outreach", orders: 112, sales: 224000, practices: 18, avgOrderValue: 2000 },
        { segment: "Partner", orders: 63, sales: 126000, practices: 12, avgOrderValue: 2000 },
      ],
    };

    return NextResponse.json(mockData);
  } catch (error) {
    console.error("POST /api/kpi/segments error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", issues: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch segment metrics" },
      { status: 500 }
    );
  }
}
