import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Get current user's onboarding documents with required types
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all required document types
    const requiredTypes = await db.requiredDocumentType.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    });

    // Get user's uploaded documents
    const userDocs = await db.userDocument.findMany({
      where: { userId: user.id },
    });

    // Build response with status for each required type
    const documentStatus = requiredTypes.map((reqType) => {
      const userDoc = userDocs.find((doc) => doc.type === reqType.code);
      
      return {
        type: reqType.code,
        name: reqType.name,
        description: reqType.description,
        required: reqType.required,
        order: reqType.order,
        status: userDoc?.status || "PENDING",
        fileName: userDoc?.fileName || null,
        fileKey: userDoc?.fileKey || null,
        mimeType: userDoc?.mimeType || null,
        sizeBytes: userDoc?.sizeBytes || null,
        signedAt: userDoc?.signedAt || null,
        createdAt: userDoc?.createdAt || null,
        updatedAt: userDoc?.updatedAt || null,
        documentId: userDoc?.id || null,
      };
    });

    return NextResponse.json({
      success: true,
      documents: documentStatus,
    });
  } catch (error) {
    console.error("Failed to fetch user documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch user documents" },
      { status: 500 }
    );
  }
}

