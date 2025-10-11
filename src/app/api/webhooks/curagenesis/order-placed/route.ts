import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/webhooks/curagenesis/order-placed
 * Webhook endpoint for CuraGenesis order events
 * Automatically matches SKUs to vendor products and populates unit costs
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature if configured
    const signature = request.headers.get("x-webhook-signature");
    const webhookSecret = process.env.CURAGENESIS_WEBHOOK_SECRET;
    
    if (webhookSecret && signature) {
      const body = await request.text();
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");
      
      if (signature !== expectedSignature) {
        console.error("Invalid webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
      
      // Parse body after verification
      const data = JSON.parse(body);
      return await processOrderWebhook(data);
    }
    
    // If no webhook secret configured, process directly
    const data = await request.json();
    return await processOrderWebhook(data);
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function processOrderWebhook(data: any) {
  const { eventType, order } = data;
  
  if (eventType !== "order.placed") {
    return NextResponse.json({ message: "Event type not handled" });
  }

  try {
    // Find matching account by practiceId or curaGenesisUserId
    const account = await prisma.account.findFirst({
      where: {
        OR: [
          { curaGenesisUserId: order.userId },
          { practiceName: order.practiceName }
        ]
      }
    });

    // Create or update order
    const dbOrder = await prisma.order.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        practiceId: order.practiceId,
        accountId: account?.id,
        orderDate: new Date(order.orderDate),
        totalAmount: order.totalAmount,
        status: order.status || "pending",
      },
      update: {
        totalAmount: order.totalAmount,
        status: order.status || "pending",
      }
    });

    // Process order items and match with vendor products
    if (order.items && Array.isArray(order.items)) {
      // Get all vendor products for SKU matching
      const vendorProducts = await prisma.product.findMany({
        select: {
          id: true,
          sku: true,
          unitPrice: true,
        }
      });

      // Create a map for quick SKU lookups
      const skuToProduct = new Map(
        vendorProducts.map(p => [p.sku.toLowerCase(), p])
      );

      // Process each order item
      for (const item of order.items) {
        // Try to match SKU (case-insensitive)
        const matchedProduct = skuToProduct.get(item.sku?.toLowerCase() || "");
        
        await prisma.orderItem.create({
          data: {
            orderId: dbOrder.id,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            // Auto-populate vendor cost if SKU matches
            vendorProductId: matchedProduct?.id,
            unitCostUsd: matchedProduct?.unitPrice,
          }
        });
      }
    }

    // Update account's total orders if matched
    if (account) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          totalOrders: {
            increment: 1
          },
          lastSyncedAt: new Date()
        }
      });
      
      // Update rep metrics if account has an owner
      if (account.ownerRepId) {
        const { updateRepMetrics } = await import("@/lib/metrics-updater");
        await updateRepMetrics(account.ownerRepId);
      }
    }

    // Log the order for monitoring
    console.log(`Order ${order.id} processed successfully${account ? ` for account ${account.practiceName}` : " (no account matched)"}`);

    return NextResponse.json({ 
      success: true, 
      orderId: dbOrder.id,
      itemsProcessed: order.items?.length || 0 
    });
  } catch (error) {
    console.error("Error processing order webhook:", error);
    return NextResponse.json({ error: "Failed to process order" }, { status: 500 });
  }
}
