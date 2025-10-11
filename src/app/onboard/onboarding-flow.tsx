"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, FileText, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

interface Document {
  id: string;
  type: string;
  status: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  corpEmail: string;
  onboardStatus: string;
  documents: Document[];
}

export function OnboardingFlow({ token }: { token: string }) {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    fetchOnboardingData();
  }, [token]);

  const fetchOnboardingData = async () => {
    try {
      const response = await fetch("/api/onboarding/status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch onboarding data");
      
      const data = await response.json();
      setUserData(data.user);
    } catch (error) {
      console.error("Error fetching onboarding data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignDocument = async (docType: string) => {
    // In production, this would redirect to DocuSign or embed signing
    console.log(`Signing document: ${docType}`);
    
    // For demo, simulate signing
    try {
      const response = await fetch("/api/onboarding/sign-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ docType }),
      });

      if (!response.ok) throw new Error("Failed to sign document");
      
      // Refresh data
      await fetchOnboardingData();
    } catch (error) {
      console.error("Error signing document:", error);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ accept_terms: true }),
      });

      if (!response.ok) throw new Error("Failed to complete onboarding");
      
      // Update local storage with active status
      const userCookie = localStorage.getItem("demo_user");
      if (userCookie) {
        const user = JSON.parse(userCookie);
        user.onboardStatus = "ACTIVE";
        localStorage.setItem("demo_user", JSON.stringify(user));
      }
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Invalid or expired onboarding link</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allDocumentsSigned = userData.documents.every(doc => doc.status === "SIGNED");

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to CuraGenesis!</h1>
          <p className="text-muted-foreground">
            Complete these steps to activate your account
          </p>
        </div>

        {/* Account Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Your Account Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm text-muted-foreground">Name</dt>
                <dd className="font-medium">{userData.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Personal Email</dt>
                <dd className="font-medium">{userData.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Corporate Email</dt>
                <dd className="font-medium">{userData.corpEmail}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Required Documents</CardTitle>
            <CardDescription>
              Please review and sign all documents to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userData.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {doc.type === "BAA" && "Business Associate Agreement"}
                        {doc.type === "HIRE_AGREEMENT" && "Independent Contractor Agreement"}
                        {doc.type === "W9" && "W-9 Tax Form"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {doc.status === "SIGNED" ? "Signed" : "Pending signature"}
                      </p>
                    </div>
                  </div>
                  <div>
                    {doc.status === "SIGNED" ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSignDocument(doc.type)}
                      >
                        Sign Now
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Complete Button */}
        <div className="text-center">
          <Button
            size="lg"
            disabled={!allDocumentsSigned || completing}
            onClick={handleComplete}
          >
            {completing ? "Completing..." : "Complete Onboarding"}
          </Button>
          {!allDocumentsSigned && (
            <p className="text-sm text-muted-foreground mt-2">
              Please sign all documents before completing onboarding
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
