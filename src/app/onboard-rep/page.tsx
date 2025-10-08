"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [baaAccepted, setBaaAccepted] = useState(false);
  const [w9Accepted, setW9Accepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const inviteToken = searchParams.get("token");
    if (!inviteToken) {
      setError("No invite token provided. Please use the link from your invitation email.");
      setLoading(false);
      return;
    }
    setToken(inviteToken);
    verifyToken(inviteToken);
  }, [searchParams]);

  const verifyToken = async (inviteToken: string) => {
    try {
      const response = await fetch("/api/onboarding/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inviteToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Invalid or expired invite token.");
      }

      const data = await response.json();
      setInviteData(data.invite);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!baaAccepted || !w9Accepted) {
      toast({
        title: "Required Documents",
        description: "Please accept both the BAA and W9 to continue.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          baaAccepted: true,
          w9Accepted: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to complete onboarding.");
      }

      const data = await response.json();

      toast({
        title: "✅ Onboarding Complete!",
        description: "You can now log in to the CRM.",
      });

      // Store credentials for login
      console.log("\n========================================");
      console.log("🎉 ONBOARDING COMPLETE");
      console.log("========================================");
      console.log("Email:", inviteData.email);
      console.log("Temp Password:", inviteData.tempPassword);
      console.log("Login URL:", window.location.origin + "/login");
      console.log("========================================\n");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to complete onboarding.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg text-[color:var(--muted)]">Loading onboarding...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl text-red-400">Onboarding Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Welcome to CuraGenesis!</CardTitle>
          <CardDescription className="text-lg mt-2">
            Complete your onboarding to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Welcome Message */}
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm">
              <strong>Hello {inviteData?.name}!</strong>
              <br />
              Email: {inviteData?.email}
              <br />
              Temp Password: <code className="bg-background px-2 py-1 rounded">{inviteData?.tempPassword}</code>
              <br />
              <span className="text-xs text-[color:var(--muted)]">
                (You&apos;ll be prompted to change your password on first login)
              </span>
            </p>
          </div>

          {/* Required Documents */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Required Documents</h3>
            <p className="text-sm text-[color:var(--muted)]">
              As an independent contractor, you must complete the following documents before accessing the CRM:
            </p>

            {/* BAA */}
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 mt-0.5 text-primary" />
                <div className="flex-1">
                  <h4 className="font-semibold">Business Associate Agreement (BAA)</h4>
                  <p className="text-sm text-[color:var(--muted)] mt-1 mb-3">
                    The BAA ensures compliance with HIPAA regulations and protects patient data.
                  </p>
                  <div className="bg-card/50 p-3 rounded border border-border mb-3 text-xs font-mono max-h-48 overflow-y-auto">
                    <p><strong>BUSINESS ASSOCIATE AGREEMENT</strong></p>
                    <p className="mt-2">This Business Associate Agreement (&quot;Agreement&quot;) is entered into between CuraGenesis (&quot;Covered Entity&quot;) and {inviteData?.name} (&quot;Business Associate&quot;).</p>
                    <p className="mt-2"><strong>1. PURPOSE:</strong> Business Associate will handle Protected Health Information (PHI) in accordance with HIPAA regulations.</p>
                    <p className="mt-2"><strong>2. OBLIGATIONS:</strong> Business Associate agrees to use appropriate safeguards to prevent unauthorized use or disclosure of PHI.</p>
                    <p className="mt-2"><strong>3. COMPLIANCE:</strong> Business Associate will comply with all applicable HIPAA Privacy and Security Rules.</p>
                    <p className="mt-2 text-[color:var(--muted)]">[This is a placeholder BAA for demo purposes]</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="baa"
                      checked={baaAccepted}
                      onCheckedChange={(checked: boolean) => setBaaAccepted(checked)}
                    />
                    <Label htmlFor="baa" className="cursor-pointer">
                      I have read and agree to the Business Associate Agreement
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* W9 */}
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 mt-0.5 text-primary" />
                <div className="flex-1">
                  <h4 className="font-semibold">IRS Form W-9</h4>
                  <p className="text-sm text-[color:var(--muted)] mt-1 mb-3">
                    The W-9 form is required for tax reporting purposes as an independent contractor.
                  </p>
                  <div className="bg-card/50 p-3 rounded border border-border mb-3 text-xs font-mono max-h-48 overflow-y-auto">
                    <p><strong>IRS FORM W-9</strong></p>
                    <p className="mt-2">Request for Taxpayer Identification Number and Certification</p>
                    <p className="mt-2"><strong>Name:</strong> {inviteData?.name}</p>
                    <p className="mt-2"><strong>Purpose:</strong> The information you provide is used by CuraGenesis to report payments made to you to the IRS.</p>
                    <p className="mt-2"><strong>Tax Classification:</strong> Independent Contractor</p>
                    <p className="mt-2"><strong>Certification:</strong> I certify that the information provided is correct and that I am not subject to backup withholding.</p>
                    <p className="mt-2 text-[color:var(--muted)]">[This is a placeholder W-9 for demo purposes]</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="w9"
                      checked={w9Accepted}
                      onCheckedChange={(checked: boolean) => setW9Accepted(checked)}
                    />
                    <Label htmlFor="w9" className="cursor-pointer">
                      I have read and agree to the W-9 form
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
              disabled={!baaAccepted || !w9Accepted || submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing Onboarding...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete Onboarding
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-xs text-[color:var(--muted)]">
            After completing onboarding, you&apos;ll be redirected to the login page
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function OnboardingRepPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}

