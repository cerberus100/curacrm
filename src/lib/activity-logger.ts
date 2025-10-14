import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export type ActivityAction =
  | "ACCOUNT_CREATED"
  | "ACCOUNT_EDITED"
  | "ACCOUNT_DELETED"
  | "CONTACT_ADDED"
  | "CONTACT_EDITED"
  | "CONTACT_DELETED"
  | "PRACTICE_SUBMITTED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_DOWNLOADED"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "ACCOUNT_ASSIGNED"
  | "BULK_IMPORT";

interface LogActivityParams {
  userId: string;
  action: ActivityAction;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  details?: string;
  metadata?: any;
  request?: NextRequest;
}

/**
 * Log activity to the activity_log table
 * This creates an audit trail of all user actions in the system
 */
export async function logActivity(params: LogActivityParams) {
  try {
    const {
      userId,
      action,
      entityType,
      entityId,
      entityName,
      details,
      metadata,
      request,
    } = params;

    // Extract IP and User-Agent from request if provided
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (request) {
      ipAddress = request.headers.get("x-forwarded-for") || 
                  request.headers.get("x-real-ip") || 
                  null;
      userAgent = request.headers.get("user-agent") || null;
    }

    await db.activityLog.create({
      data: {
        userId,
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        entityName: entityName || null,
        details: details || null,
        ipAddress,
        userAgent,
        metadata: metadata || null,
      },
    });

    console.log(`[Activity] ${action} by ${userId}${entityName ? ` - ${entityName}` : ""}`);
  } catch (error) {
    // Don't fail the main operation if logging fails
    console.error("Failed to log activity:", error);
  }
}

/**
 * Get activity logs (admin only)
 */
export async function getActivityLogs(filters?: {
  userId?: string;
  action?: string;
  entityType?: string;
  limit?: number;
  offset?: number;
}) {
  const {
    userId,
    action,
    entityType,
    limit = 100,
    offset = 0,
  } = filters || {};

  const where: any = {};
  
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;

  const [logs, total] = await Promise.all([
    db.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    }),
    db.activityLog.count({ where }),
  ]);

  return { logs, total };
}

