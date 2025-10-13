import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const REQUIRED = new Set(["w9", "baa", "hire_agreement"]);

/**
 * GET /api/recruiter/hires
 * Admin-only endpoint that returns all hires with doc and provisioning status
 */
export async function GET() {
  try {
    await requireAdmin();

    const users = await prisma.user.findMany({
      where: { role: "AGENT" }, // Using AGENT as the rep role
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        corpEmail: true,
        onboardStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const ids = users.map((u) => u.id);

    const docs = await prisma.userDocument.findMany({
      where: { userId: { in: ids } },
      select: {
        userId: true,
        type: true,
        status: true,
        signedAt: true,
      },
    });

    // TODO: Add provisionJob support when provisioning system is implemented
    // const jobs = await prisma.provisionJob.findMany({...});

    const docMap = new Map<
      string,
      Array<{ type: string; status: string; signedAt: Date | null }>
    >();
    docs.forEach((d) => {
      const arr = docMap.get(d.userId) || [];
      arr.push({
        type: d.type,
        status: d.status,
        signedAt: d.signedAt ?? null,
      });
      docMap.set(d.userId, arr);
    });

    // Placeholder for provision job map
    const jobMap = new Map<
      string,
      { status: string; error: string | null; updatedAt: Date }
    >();

    const items = users.map((u) => {
      const ud = docMap.get(u.id) || [];
      const signed = new Set(
        ud.filter((x) => x.status === "SIGNED").map((x) => x.type)
      );
      const allSigned = [...REQUIRED].every((t) => signed.has(t));
      const pj = jobMap.get(u.id);

      return {
        id: u.id,
        name: u.name,
        personalEmail: u.email,
        corpEmail: u.corpEmail || null,
        onboardStatus: u.onboardStatus,
        docs: {
          w9: ud.find((x) => x.type === "w9")?.status ?? "sent",
          baa: ud.find((x) => x.type === "baa")?.status ?? "sent",
          hire_agreement:
            ud.find((x) => x.type === "hire_agreement")?.status ?? "sent",
          allSigned,
        },
        provision: pj ? pj.status : allSigned ? "pending" : "n/a",
        provisionError: pj?.error ?? null,
        updatedAt: u.updatedAt,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/recruiter/hires error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hires" },
      { status: 500 }
    );
  }
}

