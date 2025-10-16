import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/documents-v2
 * List documents with filtering and search
 * Query params:
 *   - folderId: Filter by folder
 *   - search: Search in title, description, tags
 *   - fileType: Filter by mime type
 *   - limit: Results per page (default: 50)
 *   - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    const search = searchParams.get("search");
    const fileType = searchParams.get("fileType");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const isAdmin = user.role === "ADMIN";

    // Build where clause
    const where: any = {};

    // Folder filter
    if (folderId) {
      where.folderId = folderId === "root" ? null : folderId;
    }

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { fileName: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    // File type filter
    if (fileType) {
      where.mimeType = { contains: fileType };
    }

    // Permission filtering for non-admins
    if (!isAdmin) {
      where.AND = [
        {
          OR: [
            // Public documents
            { visibility: "PUBLIC" },
            // Role-based
            {
              AND: [
                { visibility: "ROLE_BASED" },
                {
                  permissions: {
                    some: {
                      role: user.role,
                      canView: true,
                    },
                  },
                },
              ],
            },
            // Individual permission
            {
              AND: [
                { visibility: "CUSTOM" },
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
          ],
        },
      ];
    }

    const [documents, total] = await Promise.all([
      db.documentFile.findMany({
        where,
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
          folder: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.documentFile.count({ where }),
    ]);

    return NextResponse.json({
      documents,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("GET /api/documents-v2 error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents", documents: [] },
      { status: 500 }
    );
  }
}

