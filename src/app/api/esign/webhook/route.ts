import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRecruiter } from "@/lib/auth";
import { withRateLimit, rateLimiters } from "@/lib/security/rate-limit";

/**
 * POST /api/esign/webhook
 * Handles e-signature completion webhooks from external services
 * Creates ProvisionJob for WorkMail + CRM login creation
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitError = withRateLimit(rateLimiters.strict)(request);
    if (rateLimitError) {
      return NextResponse.json(
        { error: rateLimitError.error },
        { 
          status: rateLimitError.status,
          headers: {
            'X-RateLimit-Remaining': rateLimitError.remaining.toString(),
            'X-RateLimit-Reset': rateLimitError.resetTime.toString(),
          }
        }
      );
    }

    // Verify webhook signature (implement based on your e-sign provider)
    const signature = request.headers.get('x-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, userId, status, signedAt } = body;

    if (status !== 'completed') {
      return NextResponse.json({ message: 'Document not completed' }, { status: 200 });
    }

    // Create ProvisionJob for user provisioning
    const provisionJob = await prisma.provisionJob.create({
      data: {
        userId,
        documentId,
        status: 'PENDING',
        type: 'USER_PROVISIONING',
        metadata: {
          signedAt,
          documentId,
        },
      },
    });

    // Queue the provisioning process (implement your queue system)
    // await queueProvisioningJob(provisionJob.id);

    return NextResponse.json({ 
      success: true, 
      jobId: provisionJob.id 
    });

  } catch (error) {
    console.error("POST /api/esign/webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
