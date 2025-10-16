import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { CuraGenesisFinancialsAPI } from "@/lib/curagenesis-financials-api";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RequestSchema = z.object({
  practiceId: z.string().optional(),
  repId: z.string().optional(),
  orderId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page_size: z.number().optional(),
  cursor: z.string().optional(),
});

/**
 * GET/POST /api/financials
 * Fetch financial data from CuraGenesis (admin-only)
 */
export async function GET(request: NextRequest) {
  return handleFinancialsRequest(request);
}

export async function POST(request: NextRequest) {
  return handleFinancialsRequest(request);
}

async function handleFinancialsRequest(request: NextRequest) {
  try {
    await requireAdmin();

    let params: z.infer<typeof RequestSchema>;
    
    if (request.method === 'POST') {
      const body = await request.json();
      params = RequestSchema.parse(body);
    } else {
      const searchParams = new URL(request.url).searchParams;
      params = RequestSchema.parse({
        practiceId: searchParams.get('practiceId') || undefined,
        repId: searchParams.get('repId') || undefined,
        orderId: searchParams.get('orderId') || undefined,
        from: searchParams.get('from') || undefined,
        to: searchParams.get('to') || undefined,
        page_size: searchParams.get('page_size') ? parseInt(searchParams.get('page_size')!) : undefined,
        cursor: searchParams.get('cursor') || undefined,
      });
    }

    const client = new CuraGenesisFinancialsAPI();
    const response = await client.getFinancials(params);

    return NextResponse.json(response);

  } catch (error) {
    console.error("Financials API error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", issues: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes("Unauthorized") || error.message.includes("Admin")) {
        return NextResponse.json(
          { error: "Unauthorized: Admin access required" },
          { status: 403 }
        );
      }
      
      if (error.message.includes("authentication failed")) {
        return NextResponse.json(
          { error: error.message },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch financial data" },
      { status: 500 }
    );
  }
}
