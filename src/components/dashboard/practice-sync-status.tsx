"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, Users, MapPin, Package } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";

interface SyncData {
  syncedAt: string;
  summary: {
    totalPractices: number;
    totalOrders: number;
    activePractices: number;
    recentActivations: number;
    unmatchedPractices: number;
  };
  byState: Array<{
    state: string;
    practices: number;
  }>;
  bySalesRep: Array<{
    rep: string;
    practices: number;
    totalOrders: number;
    avgOrdersPerPractice: string;
  }>;
}

export function PracticeSyncStatus() {
  const [loading, setLoading] = useState(false);
  const [syncData, setSyncData] = useState<SyncData | null>(null);
  const [hasSynced, setHasSynced] = useState(false);
  const { toast } = useToast();
  const { isAdmin, loading: userLoading } = useCurrentUser();

  const syncPractices = async () => {
    // Only admins can sync
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can sync practice data",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch("/api/kpi/sync-practices", {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to sync practices");
      }
      
      const data = await response.json();
      setSyncData(data);
      
      toast({
        title: "Sync Complete",
        description: `Successfully synced ${data.summary.totalPractices} practices`,
      });
    } catch (error) {
      console.error("Sync error:", error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync practice data from CuraGenesis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only sync once when user loads and is admin
    if (!userLoading && isAdmin && !hasSynced) {
      setHasSynced(true);
      syncPractices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, isAdmin, hasSynced]);

  // Don't render anything if not admin or still loading user
  if (userLoading || !isAdmin) {
    return null;
  }

  if (!syncData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          Loading practice data...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sync Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">CuraGenesis Practice Data</h2>
          <p className="text-sm text-muted-foreground">
            Last synced: {new Date(syncData.syncedAt).toLocaleString()}
          </p>
        </div>
        <Button 
          onClick={syncPractices} 
          disabled={loading}
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Sync Now
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Practices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncData.summary.totalPractices}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {syncData.summary.activePractices} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncData.summary.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all practices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Activations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncData.summary.recentActivations}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unmatched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncData.summary.unmatchedPractices}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Need rep assignment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top States */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Top States
          </CardTitle>
          <CardDescription>Practices by state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {syncData.byState.slice(0, 5).map((state) => (
              <div key={state.state} className="flex items-center justify-between">
                <span className="font-medium">{state.state}</span>
                <Badge variant="secondary">{state.practices} practices</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sales Rep Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Sales Rep Performance
          </CardTitle>
          <CardDescription>Practices and orders by rep</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {syncData.bySalesRep.slice(0, 10).map((rep, index) => (
              <div key={rep.rep} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{rep.rep || "Unassigned"}</p>
                    <p className="text-xs text-muted-foreground">
                      {rep.practices} practices • {rep.avgOrdersPerPractice} avg orders/practice
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{rep.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">total orders</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
