"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Search, Eye, UserCheck, UserX, ArrowLeft } from "lucide-react";

interface Rep {
  id: string;
  name: string;
  email: string;
  corpEmail: string;
  active: boolean;
  onboardStatus: string;
  activeAccounts: number;
  totalSales: number;
  totalProfit: number;
  createdAt: string;
}

export function RepsManagementClient() {
  const router = useRouter();
  const [reps, setReps] = useState<Rep[]>([]);
  const [filteredReps, setFilteredReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  useEffect(() => {
    fetchReps();
  }, []);

  useEffect(() => {
    filterReps();
  }, [reps, searchTerm, filterActive]);

  const fetchReps = async () => {
    try {
      const response = await fetch("/api/reps");
      if (!response.ok) throw new Error("Failed to fetch reps");
      const data = await response.json();
      setReps(data.reps);
    } catch (error) {
      console.error("Error fetching reps:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterReps = () => {
    let filtered = [...reps];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(rep =>
        rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rep.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rep.corpEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by active status
    if (filterActive !== null) {
      filtered = filtered.filter(rep => rep.active === filterActive);
    }

    setFilteredReps(filtered);
  };

  const toggleRepStatus = async (repId: string, newStatus: boolean) => {
    try {
      const response = await fetch(`/api/reps/${repId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update rep");

      // Update local state
      setReps(reps.map(rep =>
        rep.id === repId ? { ...rep, active: newStatus } : rep
      ));
    } catch (error) {
      console.error("Error updating rep:", error);
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

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold mb-2">Sales Representatives</h1>
        <p className="text-muted-foreground">
          Manage sales reps, view metrics, and monitor onboarding status
        </p>
      </div>

      <Card className="bg-card border-border rounded-2xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>All Reps</CardTitle>
              <CardDescription>
                {filteredReps.length} of {reps.length} reps shown
              </CardDescription>
            </div>
            <div className="flex gap-4">
              <Button
                variant={filterActive === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive(null)}
              >
                All
              </Button>
              <Button
                variant={filterActive === true ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive(true)}
              >
                Active
              </Button>
              <Button
                variant={filterActive === false ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive(false)}
              >
                Inactive
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Corp Email</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-center">Active Accounts</th>
                  <th className="pb-3 font-medium text-right">Total Sales</th>
                  <th className="pb-3 font-medium text-right">Profit</th>
                  <th className="pb-3 font-medium text-center">Active</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredReps.map((rep) => (
                  <tr key={rep.id} className="group hover:bg-muted/50">
                    <td className="py-4">
                      <div>
                        <p className="font-medium">{rep.name}</p>
                        <p className="text-sm text-muted-foreground">{rep.email}</p>
                      </div>
                    </td>
                    <td className="py-4 text-sm">{rep.corpEmail || "-"}</td>
                    <td className="py-4">{getStatusBadge(rep.onboardStatus)}</td>
                    <td className="py-4 text-center">{rep.activeAccounts}</td>
                    <td className="py-4 text-right font-medium">
                      {formatCurrency(rep.totalSales)}
                    </td>
                    <td className="py-4 text-right font-medium">
                      {formatCurrency(rep.totalProfit)}
                    </td>
                    <td className="py-4 text-center">
                      <Switch
                        checked={rep.active}
                        onCheckedChange={(checked) => toggleRepStatus(rep.id, checked)}
                      />
                    </td>
                    <td className="py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/reps/${rep.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredReps.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No reps found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
