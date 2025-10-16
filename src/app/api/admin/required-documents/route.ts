import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Get all required document types
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const types = await db.requiredDocumentType.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({
      success: true,
      types,
    });
  } catch (error) {
    console.error("Failed to fetch required document types:", error);
    return NextResponse.json(
      { error: "Failed to fetch required document types" },
      { status: 500 }
    );
  }
}

// Create or update required document type (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { id, name, code, description, required, order } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    let documentType;

    if (id) {
      // Update existing
      documentType = await db.requiredDocumentType.update({
        where: { id },
        data: {
          name,
          code,
          description,
          required: required !== undefined ? required : true,
          order: order !== undefined ? order : 0,
        },
      });
    } else {
      // Create new
      documentType = await db.requiredDocumentType.create({
        data: {
          id: randomUUID(),
          name,
          code,
          description,
          required: required !== undefined ? required : true,
          order: order !== undefined ? order : 0,
          active: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      documentType,
    });
  } catch (error: any) {
    console.error("Failed to save required document type:", error);
    
    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A document type with this code already exists" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to save required document type" },
      { status: 500 }
    );
  }
}

// Delete required document type (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Document type ID required" },
        { status: 400 }
      );
    }

    // Soft delete by setting active to false
    await db.requiredDocumentType.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to delete required document type:", error);
    return NextResponse.json(
      { error: "Failed to delete required document type" },
      { status: 500 }
    );
  }
}

