import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Reps see only documents sent to them
    // Admins see all documents
    let documents;

    if (user.role === Role.ADMIN) {
      documents = await db.libraryDocument.findMany({
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      const recipients = await db.documentRecipient.findMany({
        where: {
          repId: user.id,
        },
        include: {
          document: {
            include: {
              uploadedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          sentAt: "desc",
        },
      });

      documents = recipients.map((r) => ({
        ...r.document,
        sentAt: r.sentAt,
        viewedAt: r.viewedAt,
        status: r.status,
      }));
    }

    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error("Failed to fetch user documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
