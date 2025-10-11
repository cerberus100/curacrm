import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token");
    
    if (!token) {
      return null;
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token.value, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };
    
    // Get fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        onboardStatus: true,
        onboardedAt: true,
      }
    });
    
    if (!user || !user.active) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
  
  return user;
}

export async function requireRecruiter() {
  const user = await getCurrentUser();
  
  if (!user || (user.role !== "RECRUITER" && user.role !== "ADMIN")) {
    throw new Error("Unauthorized: Recruiter or Admin access required");
  }
  
  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized: Authentication required");
  }
  
  return user;
}

export async function requireRepOrAdmin() {
  const user = await getCurrentUser();
  
  if (!user || (user.role !== "AGENT" && user.role !== "ADMIN")) {
    throw new Error("Unauthorized: Rep or Admin access required");
  }
  
  return user;
}
