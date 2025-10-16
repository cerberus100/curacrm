import { NextResponse } from "next/server";
import { SESClient, GetAccountSendingEnabledCommand, GetSendQuotaCommand } from "@aws-sdk/client-ses";
import { requireAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();

    const region = process.env.AWS_REGION || "us-east-1";
    const ses = new SESClient({ region });

    const [sendingEnabledResp, quotaResp] = await Promise.all([
      ses.send(new GetAccountSendingEnabledCommand({})),
      ses.send(new GetSendQuotaCommand({})),
    ]);

    const sendingEnabled = Boolean(sendingEnabledResp.Enabled);
    const max24HourSend = Number(quotaResp.Max24HourSend || 0);
    const maxSendRate = Number(quotaResp.MaxSendRate || 0);

    // Heuristic: sandbox is typically limited (e.g., 200 emails/day) and identities must be verified.
    // We can't check identity verification here without additional calls; this heuristic is sufficient.
    const sandboxLikely = !sendingEnabled || max24HourSend <= 200;

    return NextResponse.json({
      region,
      sendingEnabled,
      max24HourSend,
      maxSendRate,
      sandboxLikely,
      mode: sandboxLikely ? "SANDBOX" : "PRODUCTION",
    });
  } catch (error: any) {
    console.error("GET /api/admin/ses/status error:", error);
    return NextResponse.json({ error: "Failed to fetch SES status", details: error?.message }, { status: 500 });
  }
}


