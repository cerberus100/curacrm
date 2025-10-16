import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { join } from "path";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/documents-v2/[id]
 * Delete a document (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const document = await db.documentFile.findUnique({
      where: { id: params.id },
      select: { title: true, fileKey: true, folder: { select: { name: true } } },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete file from disk
    try {
      const filePath = join(process.cwd(), "uploads", document.fileKey);
      await unlink(filePath);
    } catch (fileError) {
      console.error("Failed to delete file from disk:", fileError);
      // Continue even if file deletion fails
    }

    // Delete from database
    await db.documentFile.delete({
      where: { id: params.id },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      action: "ACCOUNT_DELETED", // Will add DOCUMENT_DELETED later
      entityType: "DocumentFile",
      entityId: params.id,
      entityName: document.title,
      details: `Deleted from ${document.folder?.name || "root"}`,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/documents-v2/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}

