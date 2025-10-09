import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

// Prevent static generation of this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/webhooks/curagenesis/practice-update
 * Real-time webhook endpoint for CuraGenesis practice updates
 * This webhook should be configured in CuraGenesis to trigger on:
 * - New practice creation
 * - Order placement
 * - Practice status changes
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (if CuraGenesis provides one)
    const signature = request.headers.get("x-webhook-signature");
    const webhookSecret = process.env.CURAGENESIS_WEBHOOK_SECRET;
    
    if (webhookSecret && signature) {
      const body = await request.text();
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");
      
      if (signature !== expectedSignature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
      
      // Parse body after verification
      const payload = JSON.parse(body);
      await processWebhook(payload);
    } else {
      // Process without signature verification (for development)
      const payload = await request.json();
      await processWebhook(payload);
    }
    
    return NextResponse.json({ success: true, received: true });
    
  } catch (error) {
    console.error("POST /api/webhooks/curagenesis/practice-update error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function processWebhook(payload: any) {
  const { event, data } = payload;
  
  switch (event) {
    case "practice.created":
    case "practice.updated":
      await handlePracticeUpdate(data);
      break;
      
    case "order.placed":
      await handleOrderPlaced(data);
      break;
      
    case "practice.activated":
      await handlePracticeActivated(data);
      break;
      
    default:
      console.log(`Unhandled webhook event: ${event}`);
  }
}

async function handlePracticeUpdate(data: any) {
  const { userId, practiceId, totalOrders, state, specialty, salesRep } = data;
  
  // Find account by CuraGenesis user ID
  const account = await prisma.account.findFirst({
    where: { curaGenesisUserId: userId }
  });
  
  if (account) {
    // Update existing account with latest data
    await prisma.account.update({
      where: { id: account.id },
      data: {
        totalOrders: totalOrders || account.totalOrders,
        lastSyncedAt: new Date()
      }
    });
    
    console.log(`Updated account ${account.id} with practice ${practiceId}`);
  } else {
    // Log unmatched practice for investigation
    await prisma.setting.upsert({
      where: { key: `unmatched_practice_${practiceId}` },
      update: {
        value: {
          practiceId,
          userId,
          state,
          specialty,
          salesRep,
          totalOrders,
          lastSeen: new Date().toISOString()
        }
      },
      create: {
        key: `unmatched_practice_${practiceId}`,
        value: {
          practiceId,
          userId,
          state,
          specialty,
          salesRep,
          totalOrders,
          firstSeen: new Date().toISOString()
        }
      }
    });
  }
}

async function handleOrderPlaced(data: any) {
  const { userId, orderId, orderAmount, orderDate } = data;
  
  // Find and update account
  const account = await prisma.account.findFirst({
    where: { curaGenesisUserId: userId }
  });
  
  if (account) {
    // Increment order count
    await prisma.account.update({
      where: { id: account.id },
      data: {
        totalOrders: { increment: 1 },
        lastSyncedAt: new Date()
      }
    });
    
    // Create notification for the sales rep
    await prisma.setting.create({
      data: {
        key: `notification_order_${orderId}`,
        value: {
          type: "new_order",
          accountId: account.id,
          repId: account.ownerRepId,
          orderId,
          orderAmount,
          orderDate,
          practiceName: account.practiceName,
          createdAt: new Date().toISOString()
        }
      }
    });
    
    console.log(`New order ${orderId} for account ${account.id}`);
  }
}

async function handlePracticeActivated(data: any) {
  const { userId, practiceId, activatedAt } = data;
  
  // Find account and update activation status
  const account = await prisma.account.findFirst({
    where: { curaGenesisUserId: userId }
  });
  
  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: {
        status: "ACTIVE",
        lastSyncedAt: new Date()
      }
    });
    
    // Create notification for the sales rep
    await prisma.setting.create({
      data: {
        key: `notification_activation_${practiceId}`,
        value: {
          type: "practice_activated",
          accountId: account.id,
          repId: account.ownerRepId,
          practiceId,
          activatedAt,
          practiceName: account.practiceName,
          createdAt: new Date().toISOString()
        }
      }
    });
    
    console.log(`Practice ${practiceId} activated for account ${account.id}`);
  }
}
