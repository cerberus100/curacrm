import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { CuraGenesisUserAPI } from "@/lib/curagenesis-api";

/**
 * GET /api/kpi/sync-practices/cron
 * Automated endpoint for scheduled practice syncing
 * Can be called by AWS EventBridge, Vercel Cron, or any scheduler
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication for cron jobs
    const headersList = await headers();
    const cronSecret = headersList.get("x-cron-secret");
    
    // Uncomment to enable cron authentication
    // if (cronSecret !== process.env.CRON_SECRET) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const client = new CuraGenesisUserAPI();
    
    // Check last sync time to prevent too frequent syncs
    const lastSync = await prisma.setting.findUnique({
      where: { key: "last_practice_sync" }
    });
    
    if (lastSync) {
      const lastSyncTime = new Date(lastSync.value as string);
      const hoursSinceSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60);
      
      // Skip if synced within the last hour
      if (hoursSinceSync < 1) {
        return NextResponse.json({
          success: true,
          message: "Sync skipped - already synced within the last hour",
          lastSyncedAt: lastSyncTime.toISOString()
        });
      }
    }
    
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
    
    let updatedCount = 0;
    let newOrdersCount = 0;
    
    // Process each practice
    for (const practice of practices) {
      const localAccount = accountMap.get(practice.userId);
      
      if (localAccount) {
        // Check if order count changed
        const ordersDiff = practice.totalOrders - (localAccount.totalOrders || 0);
        if (ordersDiff > 0) {
          newOrdersCount += ordersDiff;
        }
        
        // Update order count in local database
        await prisma.account.update({
          where: { id: localAccount.id },
          data: {
            totalOrders: practice.totalOrders,
            lastSyncedAt: new Date()
          }
        });
        updatedCount++;
      }
    }
    
    // Update last sync timestamp
    await prisma.setting.upsert({
      where: { key: "last_practice_sync" },
      update: { value: new Date().toISOString() },
      create: { 
        key: "last_practice_sync", 
        value: new Date().toISOString() 
      }
    });
    
    // Log sync activity
    await prisma.setting.upsert({
      where: { key: "sync_history" },
      update: {
        value: {
          lastSync: new Date().toISOString(),
          practicesFound: practices.length,
          accountsUpdated: updatedCount,
          newOrders: newOrdersCount
        }
      },
      create: {
        key: "sync_history",
        value: {
          lastSync: new Date().toISOString(),
          practicesFound: practices.length,
          accountsUpdated: updatedCount,
          newOrders: newOrdersCount
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      summary: {
        practicesFound: practices.length,
        accountsUpdated: updatedCount,
        newOrders: newOrdersCount
      }
    });
    
  } catch (error) {
    console.error("GET /api/kpi/sync-practices/cron error:", error);
    
    // Log error for monitoring
    await prisma.setting.upsert({
      where: { key: "sync_error_log" },
      update: {
        value: {
          lastError: new Date().toISOString(),
          message: error instanceof Error ? error.message : "Unknown error"
        }
      },
      create: {
        key: "sync_error_log",
        value: {
          lastError: new Date().toISOString(),
          message: error instanceof Error ? error.message : "Unknown error"
        }
      }
    });
    
    return NextResponse.json(
      { 
        error: "Failed to sync practices", 
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
