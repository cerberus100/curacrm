import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

/**
 * Server-side authentication utilities
 * These run only on the server and have access to the database
 */

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  onboardedAt: Date | null;
  firstLoginAt: Date | null;
}

/**
 * Get the current user from session
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    // In demo/dev mode, check for SKIP_AUTH
    if (process.env.SKIP_AUTH === "true") {
      // Return a mock admin user for development
      return {
        id: "dev-admin-id",
        name: "Dev Admin",
        email: "admin@dev.local",
        role: "ADMIN",
        active: true,
        onboardedAt: new Date(),
        firstLoginAt: new Date(),
      };
    }

    // Get user ID from cookie (check both userId and auth-token for compatibility)
    const cookieStore = await cookies();
    let userId = cookieStore.get("userId")?.value;
    
    // If userId cookie doesn't exist, try to decode from auth-token JWT
    if (!userId) {
      const token = cookieStore.get("auth-token")?.value;
      if (token) {
        try {
          const jwt = require("jsonwebtoken");
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret-key") as any;
          userId = decoded.userId;
        } catch (error) {
          console.error("JWT verification failed:", error);
          return null;
        }
      }
    }

    if (!userId) {
      return null;
    }

    // Fetch user from database
    const user = await db.user.findUnique({
      where: { id: userId, active: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        onboardedAt: true,
        firstLoginAt: true,
      },
    });

    return user;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}

/**
 * Require that the user is authenticated
 * Throws 401 if not authenticated
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

/**
 * Require that the user is an admin
 * Throws 403 if not admin
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireAuth();

  if (user.role !== "ADMIN") {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}

/**
 * Require that the user is either admin or rep
 * This is for routes accessible to all authenticated users
 */
export async function requireRepOrAdmin(): Promise<CurrentUser> {
  return await requireAuth();
}

/**
 * Require that the user is a recruiter
 * Throws 403 if not recruiter
 */
export async function requireRecruiter(): Promise<CurrentUser> {
  const user = await requireAuth();

  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    throw new Error("Forbidden: Recruiter access required");
  }

  return user;
}

/**
 * Check if user has completed onboarding
 */
export function hasCompletedOnboarding(user: CurrentUser): boolean {
  return user.onboardedAt !== null;
}

/**
 * Check if user needs onboarding
 * Reps need onboarding, admins don't
 */
export function needsOnboarding(user: CurrentUser): boolean {
  return user.role === "AGENT" && !hasCompletedOnboarding(user);
}
