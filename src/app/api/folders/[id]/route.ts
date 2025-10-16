import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateFolderSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
});

/**
 * GET /api/folders/[id]
 * Get folder with contents
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

    const folder = await db.folder.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        documents: {
          include: {
            uploadedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        children: {
          include: {
            _count: {
              select: { documents: true },
            },
          },
          orderBy: { name: "asc" },
        },
        parent: {
          select: { id: true, name: true },
        },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json({ folder });
  } catch (error) {
    console.error("GET /api/folders/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch folder" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/folders/[id]
 * Update folder (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const validated = UpdateFolderSchema.parse(body);

    const folder = await db.folder.update({
      where: { id: params.id },
      data: validated,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      action: "ACCOUNT_EDITED", // Will add FOLDER_EDITED later
      entityType: "Folder",
      entityId: folder.id,
      entityName: folder.name,
      details: `Updated folder`,
      request,
    });

    return NextResponse.json({ folder });
  } catch (error) {
    console.error("PATCH /api/folders/[id] error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update folder" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/folders/[id]
 * Delete folder (Admin only)
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

    const folder = await db.folder.findUnique({
      where: { id: params.id },
      select: { name: true },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    await db.folder.delete({
      where: { id: params.id },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      action: "ACCOUNT_DELETED", // Will add FOLDER_DELETED later
      entityType: "Folder",
      entityId: params.id,
      entityName: folder.name,
      details: `Deleted folder`,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/folders/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete folder" },
      { status: 500 }
    );
  }
}

