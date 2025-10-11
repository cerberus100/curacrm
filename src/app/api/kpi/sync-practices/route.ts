import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CuraGenesisUserAPI } from "@/lib/curagenesis-api";
import { requireAdmin } from "@/lib/auth-helpers";

// Prevent static generation of this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/kpi/sync-practices
 * Fetch all practices from CuraGenesis and sync with local data
 */
export async function GET(request: NextRequest) {
  return syncPractices();
}

/**
 * POST /api/kpi/sync-practices
 * Fetch all practices from CuraGenesis and sync with local data
 */
export async function POST(request: NextRequest) {
  return syncPractices();
}

async function syncPractices() {
  try {
    // Check if user is admin
    try {
      await requireAdmin();
    } catch (error) {
      return NextResponse.json({
        error: "Unauthorized: Admin access required"
      }, { status: 403 });
    }
    
    // Check if vendor token is available
    if (!process.env.CURAGENESIS_VENDOR_TOKEN) {
      return NextResponse.json({
        error: "CuraGenesis vendor token not configured",
        details: "Please set CURAGENESIS_VENDOR_TOKEN in your environment variables"
      }, { status: 500 });
    }

    const client = new CuraGenesisUserAPI();
    
    // Fetch all practices from CuraGenesis
    const practices = await client.getAllPractices();
    
    // Get all our accounts with CuraGenesis user IDs
    const accounts = await prisma.account.findMany({
      where: {
        curaGenesisUserId: { not: null }
      },
      include: {
        ownerRep: true
      }
    });
    
    // Create a map for quick lookup
    const accountMap = new Map(
      accounts.map(acc => [acc.curaGenesisUserId!, acc])
    );
    
    // Prepare KPI data
    const kpiData = {
      totalPractices: practices.length,
      totalOrders: 0,
      practicesByState: new Map<string, number>(),
      practicesBySalesRep: new Map<string, { count: number; orders: number }>(),
      activePractices: 0,
      recentActivations: [] as any[],
      unmatchedPractices: [] as any[]
    };
    
    // Process each practice
    for (const practice of practices) {
      // Accumulate total orders
      kpiData.totalOrders += practice.totalOrders;
      
      // Count by state
      const stateCount = kpiData.practicesByState.get(practice.state) || 0;
      kpiData.practicesByState.set(practice.state, stateCount + 1);
      
      // Count active practices (those with orders)
      if (practice.totalOrders > 0) {
        kpiData.activePractices++;
      }
      
      // Track recent activations (last 30 days)
      const activationDate = new Date(practice.activatedAtIso);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (activationDate > thirtyDaysAgo) {
        kpiData.recentActivations.push({
          practiceId: practice.practiceId,
          activatedAt: practice.activatedAtIso,
          state: practice.state,
          totalOrders: practice.totalOrders
        });
      }
      
      // Save or update practice in database
      const localAccount = accountMap.get(practice.userId);
      
      if (localAccount) {
        // Update existing account
        const repName = localAccount.ownerRep?.name || "Unassigned";
        const repData = kpiData.practicesBySalesRep.get(repName) || { count: 0, orders: 0 };
        repData.count++;
        repData.orders += practice.totalOrders;
        kpiData.practicesBySalesRep.set(repName, repData);
        
        await prisma.account.update({
          where: { id: localAccount.id },
          data: {
            totalOrders: practice.totalOrders,
            specialty: practice.specialty || localAccount.specialty,
            state: practice.state || localAccount.state,
            status: practice.activatedAt ? "ACTIVE" : "PENDING",
            lastSyncedAt: new Date()
          }
        });
      } else {
        // CREATE new account in database from CuraGenesis practice
        const newAccount = await prisma.account.create({
          data: {
            practiceName: practice.practiceId, // Will be updated with real name later
            curaGenesisUserId: practice.userId,
            specialty: practice.specialty,
            state: practice.state,
            totalOrders: practice.totalOrders,
            status: practice.activatedAt ? "ACTIVE" : "PENDING",
            lastSyncedAt: new Date(),
            createdAt: practice.activatedAt ? new Date(practice.activatedAt) : new Date()
          }
        });
        
        // Track by sales rep
        const repData = kpiData.practicesBySalesRep.get(practice.salesRep || "Unassigned") || { count: 0, orders: 0 };
        repData.count++;
        repData.orders += practice.totalOrders;
        kpiData.practicesBySalesRep.set(practice.salesRep || "Unassigned", repData);
        
        // Track as newly synced
        kpiData.unmatchedPractices.push({
          practiceId: practice.practiceId,
          salesRep: practice.salesRep,
          state: practice.state,
          totalOrders: practice.totalOrders
        });
      }
    }
    
    // Convert maps to arrays for JSON response
    const response = {
      success: true,
      syncedAt: new Date().toISOString(),
      summary: {
        totalPractices: kpiData.totalPractices,
        totalOrders: kpiData.totalOrders,
        activePractices: kpiData.activePractices,
        recentActivations: kpiData.recentActivations.length,
        unmatchedPractices: kpiData.unmatchedPractices.length
      },
      byState: Array.from(kpiData.practicesByState.entries()).map(([state, count]) => ({
        state,
        practices: count
      })).sort((a, b) => b.practices - a.practices),
      bySalesRep: Array.from(kpiData.practicesBySalesRep.entries()).map(([rep, data]) => ({
        rep,
        practices: data.count,
        totalOrders: data.orders,
        avgOrdersPerPractice: data.count > 0 ? (data.orders / data.count).toFixed(2) : "0"
      })).sort((a, b) => b.totalOrders - a.totalOrders),
      recentActivations: kpiData.recentActivations.sort((a, b) => 
        new Date(b.activatedAt).getTime() - new Date(a.activatedAt).getTime()
      ),
      unmatchedPractices: kpiData.unmatchedPractices
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error("GET /api/kpi/sync-practices error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to sync practices", 
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

