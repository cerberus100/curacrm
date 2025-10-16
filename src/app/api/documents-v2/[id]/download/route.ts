import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/documents-v2/[id]/download
 * Download a document (with permission check)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const document = await db.documentFile.findUnique({
      where: { id: params.id },
      include: {
        permissions: true,
        folder: { select: { name: true } },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Permission check
    const isAdmin = user.role === "ADMIN";
    const hasAccess =
      isAdmin ||
      document.visibility === "PUBLIC" ||
      (document.visibility === "ROLE_BASED" &&
        document.permissions.some((p) => p.role === user.role && p.canDownload)) ||
      (document.visibility === "CUSTOM" &&
        document.permissions.some((p) => p.userId === user.id && p.canDownload));

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Read file
    const filePath = join(process.cwd(), "uploads", document.fileKey);
    const fileBuffer = await readFile(filePath);

    // Log download activity
    await logActivity({
      userId: user.id,
      action: "DOCUMENT_DOWNLOADED",
      entityType: "DocumentFile",
      entityId: document.id,
      entityName: document.title,
      details: `Downloaded from ${document.folder?.name || "root"}`,
      request,
    });

    // Return file
    return new NextResponse(fileBuffer as any, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `attachment; filename="${document.fileName}"`,
        "Content-Length": document.sizeBytes.toString(),
      },
    });
  } catch (error) {
    console.error("GET /api/documents-v2/[id]/download error:", error);
    return NextResponse.json(
      { error: "Failed to download document" },
      { status: 500 }
    );
  }
}

