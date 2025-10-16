import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateFolderSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  parentId: z.string().uuid().optional().nullable(),
});

/**
 * GET /api/folders
 * List all folders (with permission filtering for non-admins)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = user.role === "ADMIN";

    // Admins see all folders
    if (isAdmin) {
      const folders = await db.folder.findMany({
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { documents: true, children: true },
          },
        },
        orderBy: { name: "asc" },
      });

      return NextResponse.json({ folders });
    }

    // Non-admins see only folders they have permission to
    const folders = await db.folder.findMany({
      where: {
        OR: [
          // Public folders (via document visibility)
          {
            documents: {
              some: {
                visibility: "PUBLIC",
              },
            },
          },
          // Role-based permissions
          {
            permissions: {
              some: {
                role: user.role,
                canView: true,
              },
            },
          },
          // Individual user permissions
          {
            permissions: {
              some: {
                userId: user.id,
                canView: true,
              },
            },
          },
        ],
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ folders });
  } catch (error) {
    console.error("GET /api/folders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch folders", folders: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/folders
 * Create a new folder (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const validated = CreateFolderSchema.parse(body);

    const folder = await db.folder.create({
      data: {
        name: validated.name,
        description: validated.description,
        parentId: validated.parentId,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { documents: true, children: true },
        },
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      action: "ACCOUNT_CREATED", // Will add FOLDER_CREATED later
      entityType: "Folder",
      entityId: folder.id,
      entityName: folder.name,
      details: validated.parentId ? `Created subfolder` : `Created root folder`,
      request,
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    console.error("POST /api/folders error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}

