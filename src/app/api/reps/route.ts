import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

/**
 * GET /api/reps
 * Get list of reps with filters (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    
    const searchParams = request.nextUrl.searchParams;
    const active = searchParams.get('active');
    
    const whereClause: any = {
      role: "AGENT"
    };
    
    if (active !== null) {
      whereClause.active = active === 'true';
    }
    
    const reps = await prisma.user.findMany({
      where: whereClause,
      include: {
        repProfile: true,
        _count: {
          select: {
            accounts: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Format the response
    const formattedReps = reps.map(rep => ({
      id: rep.id,
      name: rep.name,
      email: rep.email,
      corpEmail: rep.corpEmail,
      active: rep.active,
      onboardStatus: rep.onboardStatus,
      activeAccounts: rep._count.accounts,
      totalSales: rep.repProfile?.totalSalesUsd || 0,
      totalProfit: rep.repProfile?.totalProfitUsd || 0,
      createdAt: rep.createdAt,
    }));
    
    return NextResponse.json({
      success: true,
      reps: formattedReps
    });
    
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    console.error("Failed to fetch reps:", error);
    return NextResponse.json({ 
      error: "Failed to fetch reps" 
    }, { status: 500 });
  }
}
