"use client";

import { useEffect, useState } from "react";
import { Role } from "@prisma/client";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  onboardedAt: Date | null;
  firstLoginAt: Date | null;
  baaCompleted: boolean;
  baaCompletedAt: Date | null;
  w9Completed: boolean;
  w9CompletedAt: Date | null;
  passwordResetRequired: boolean;
}

/**
 * Client-side hook to get the current user
 * Fetches from API and caches in state
 */
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        // Demo mode: Check localStorage first
        const demoUser = localStorage.getItem("demo_user");
        if (demoUser) {
          console.log("👤 Using demo user from localStorage");
          const parsedUser = JSON.parse(demoUser);
          setUser({
            ...parsedUser,
            onboardedAt: new Date(),
            firstLoginAt: new Date(),
            baaCompleted: true,
            baaCompletedAt: new Date(),
            w9Completed: true,
            w9CompletedAt: new Date(),
            passwordResetRequired: false,
          });
          setLoading(false);
          return;
        }

        // Try API (for production auth)
        const response = await fetch("/api/auth/me");

        if (!response.ok) {
          if (response.status === 401) {
            setUser(null);
            return;
          }
          throw new Error("Failed to fetch user");
        }

        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  return {
    user,
    loading,
    error,
   isAdmin: user?.role === "ADMIN",
   isRep: user?.role === "AGENT",
    hasCompletedOnboarding: user?.onboardedAt !== null,
    needsOnboarding: user?.role === "AGENT" && user?.onboardedAt === null,
    baaCompleted: user?.baaCompleted || false,
    w9Completed: user?.w9Completed || false,
    needsPasswordReset: user?.passwordResetRequired || false,
  };
}
