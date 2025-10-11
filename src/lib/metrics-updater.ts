import { prisma } from "@/lib/db";

/**
 * Update rep profile metrics based on orders
 * Called when orders sync from CuraGenesis or webhooks
 */
export async function updateRepMetrics(repId: string) {
  try {
    // Get all accounts owned by this rep
    const accounts = await prisma.account.findMany({
      where: { ownerRepId: repId },
      select: { id: true }
    });
    
    const accountIds = accounts.map(a => a.id);
    
    // Calculate metrics from last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    // Get all orders for rep's accounts
    const orders = await prisma.order.findMany({
      where: {
        accountId: { in: accountIds },
        orderDate: { gte: ninetyDaysAgo }
      },
      include: {
        items: true
      }
    });
    
    // Calculate totals
    let totalRevenue = 0;
    let totalProfit = 0;
    const activeAccountIds = new Set<string>();
    
    for (const order of orders) {
      if (order.accountId) {
        activeAccountIds.add(order.accountId);
      }
      
      for (const item of order.items) {
        const revenue = parseFloat(item.totalPrice.toString());
        totalRevenue += revenue;
        
        // Calculate profit if we have cost data
        if (item.unitCostUsd) {
          const cost = parseFloat(item.unitCostUsd.toString()) * item.quantity;
          const profit = revenue - cost;
          totalProfit += profit;
        } else {
          // If no cost data, assume 50% margin (you can adjust this)
          totalProfit += revenue * 0.5;
        }
      }
    }
    
    // Update or create rep profile
    await prisma.repProfile.upsert({
      where: { userId: repId },
      create: {
        userId: repId,
        totalSalesUsd: totalRevenue,
        totalProfitUsd: totalProfit,
        activeAccountsCount: activeAccountIds.size,
      },
      update: {
        totalSalesUsd: totalRevenue,
        totalProfitUsd: totalProfit,
        activeAccountsCount: activeAccountIds.size,
        updatedAt: new Date(),
      }
    });
    
    console.log(`Updated metrics for rep ${repId}: Revenue=${totalRevenue}, Profit=${totalProfit}, Active Accounts=${activeAccountIds.size}`);
    
  } catch (error) {
    console.error(`Failed to update metrics for rep ${repId}:`, error);
  }
}

/**
 * Update all rep metrics (for scheduled jobs)
 */
export async function updateAllRepMetrics() {
  try {
    const reps = await prisma.user.findMany({
      where: { role: "AGENT" },
      select: { id: true }
    });
    
    console.log(`Updating metrics for ${reps.length} reps...`);
    
    for (const rep of reps) {
      await updateRepMetrics(rep.id);
    }
    
    console.log("Completed updating all rep metrics");
    
  } catch (error) {
    console.error("Failed to update all rep metrics:", error);
  }
}
