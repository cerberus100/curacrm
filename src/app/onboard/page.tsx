"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams?.get("token");
    if (tokenParam) {
      setToken(tokenParam);
      verifyToken(tokenParam);
    } else {
      // No token, check if user is logged in and needs onboarding
      checkCurrentUser();
    }
  }, [searchParams]);

  const verifyToken = async (inviteToken: string) => {
    try {
      const response = await fetch("/api/auth/verify-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inviteToken }),
      });

      if (!response.ok) {
        throw new Error("Invalid or expired invite token");
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Invalid invite link",
        variant: "destructive",
      });
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        router.push("/login");
        return;
      }

      const currentUser = await response.json();
      
      // If already onboarded, redirect to dashboard
      if (currentUser.onboardedAt) {
        router.push("/dashboard");
        return;
      }

      setUser(currentUser);
    } catch (error) {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!accepted) {
      toast({
        title: "Error",
        description: "Please accept the terms to continue",
        variant: "destructive",
      });
      return;
    }

    setCompleting(true);

    try {
      const response = await fetch("/api/auth/complete-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete onboarding");
      }

      toast({
        title: "✅ Welcome!",
        description: "Onboarding complete. Redirecting to dashboard...",
      });

      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete onboarding",
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-[color:var(--muted)]">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img 
              src="/curagenesis-logo.jpg" 
              alt="CuraGenesis Logo" 
              className="h-20 w-20 mx-auto object-contain"
            />
          </div>
          <CardTitle className="text-2xl">Welcome to CuraGenesis!</CardTitle>
          <CardDescription>
            Let&apos;s get you set up
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Confirm Information */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold">Confirm Your Information</h3>
                <div className="mt-2 space-y-2 text-sm">
                  <div>
                    <Label className="text-[color:var(--muted)]">Name</Label>
                    <div className="font-medium">{user.name}</div>
                  </div>
                  <div>
                    <Label className="text-[color:var(--muted)]">Email</Label>
                    <div className="font-medium">{user.email}</div>
                  </div>
                  <div>
                    <Label className="text-[color:var(--muted)]">Role</Label>
                    <div className="font-medium capitalize">{user.role}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Accept Terms */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className={`h-5 w-5 mt-0.5 ${accepted ? "text-green-400" : "text-[color:var(--muted)]"}`} />
              <div className="flex-1">
                <h3 className="font-semibold">Accept Terms</h3>
                <div className="mt-3 p-4 border border-border rounded-lg bg-card/50">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={accepted}
                      onCheckedChange={(checked: boolean) => setAccepted(checked)}
                    />
                    <Label
                      htmlFor="terms"
                      className="text-sm cursor-pointer"
                    >
                      I agree to the Terms of Service and Privacy Policy. I understand that I will be using this system to manage healthcare practice information and will handle all data responsibly and in compliance with applicable regulations.
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Complete Button */}
          <div className="pt-4">
            <Button
              onClick={handleComplete}
              disabled={!accepted || completing}
              className="w-full"
              size="lg"
            >
              {completing ? "Completing..." : "Complete Setup"}
            </Button>
          </div>

          <div className="text-center text-xs text-[color:var(--muted)]">
            Need help? Contact your administrator
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
