"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, DollarSign, Users, TrendingUp, FileText, CheckCircle, XCircle, Clock } from "lucide-react";

interface RepDetail {
  id: string;
  name: string;
  email: string;
  corpEmail: string;
  active: boolean;
  onboardStatus: string;
  suspensionReason: string | null;
  createdAt: string;
  repProfile: {
    totalSalesUsd: number;
    totalProfitUsd: number;
    activeAccountsCount: number;
  };
  userDocuments: Array<{
    id: string;
    type: string;
    status: string;
    fileKey?: string;
    createdAt: string;
  }>;
  accounts: Array<{
    id: string;
    practiceName: string;
    status: string;
    totalOrders: number;
  }>;
  recruiterInvitedBy?: {
    name: string;
    email: string;
  };
}

export function RepDetailClient() {
  const params = useParams();
  const router = useRouter();
  const repId = params.id as string;
  
  const [rep, setRep] = useState<RepDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRepDetail();
  }, [repId]);

  const fetchRepDetail = async () => {
    try {
      const response = await fetch(`/api/reps/${repId}`);
      if (!response.ok) throw new Error("Failed to fetch rep");
      const data = await response.json();
      setRep(data.rep);
    } catch (error) {
      console.error("Error fetching rep:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRepStatus = async (newStatus: boolean) => {
    try {
      let reason = undefined;
      
      // If deactivating, ask for reason
      if (!newStatus) {
        reason = prompt("Optional: Enter reason for deactivating this rep:");
      }
      
      const response = await fetch(`/api/reps/${repId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newStatus, reason }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        alert(data.error || "Failed to update rep");
        return;
      }
      
      // Update local state
      if (rep) {
        setRep({
          ...rep,
          active: data.active,
          suspensionReason: data.suspensionReason
        });
      }
      
      alert(newStatus ? "Rep reactivated successfully!" : "Rep deactivated");
    } catch (error) {
      console.error("Error updating rep:", error);
      alert("Failed to update rep status");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      INVITED: { variant: "secondary", label: "Invited" },
      EMAIL_CREATED: { variant: "secondary", label: "Email Created" },
      CRM_USER_CREATED: { variant: "secondary", label: "CRM Created" },
      PENDING_DOCS: { variant: "warning", label: "Pending Docs" },
      ACTIVE: { variant: "success", label: "Active" },
      SUSPENDED: { variant: "destructive", label: "Suspended" },
    };

    const config = statusConfig[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDocStatusIcon = (status: string) => {
    switch (status) {
      case "SIGNED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "SENT":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!rep) {
    return (
      <div className="container mx-auto p-8">
        <p>Rep not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/reps")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Reps
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{rep.name}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>{rep.email}</span>
              {rep.corpEmail && (
                <>
                  <span>•</span>
                  <span>{rep.corpEmail}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {getStatusBadge(rep.onboardStatus)}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={rep.active}
                  onCheckedChange={toggleRepStatus}
                />
              </div>
              {!rep.active && rep.suspensionReason && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Reason:</span> {rep.suspensionReason}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(rep.repProfile?.totalSalesUsd || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(rep.repProfile?.totalProfitUsd || 0)}
            </div>
            <p className="text-xs text-muted-foreground">After COGS</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rep.repProfile?.activeAccountsCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">Last 90 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Section */}
      <Card className="bg-card border-border rounded-2xl mb-6">
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Onboarding and compliance documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rep.userDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{doc.type.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getDocStatusIcon(doc.status)}
                  <span className="text-sm">{doc.status}</span>
                  {doc.fileKey && (
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accounts Section */}
      <Card className="bg-card border-border rounded-2xl">
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>{rep.accounts.length} accounts managed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Practice Name</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Total Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rep.accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-muted/50">
                    <td className="py-3">
                      <button
                        onClick={() => router.push(`/intake/${account.id}`)}
                        className="font-medium hover:underline"
                      >
                        {account.practiceName}
                      </button>
                    </td>
                    <td className="py-3">
                      <Badge variant={account.status === "ACTIVE" ? "default" : "secondary"}>
                        {account.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">{account.totalOrders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Invited By Info */}
      {rep.recruiterInvitedBy && (
        <div className="mt-6 text-sm text-muted-foreground">
          Invited by {rep.recruiterInvitedBy.name} ({rep.recruiterInvitedBy.email})
        </div>
      )}
    </div>
  );
}
