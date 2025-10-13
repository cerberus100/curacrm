"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Building2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  team: "IN_HOUSE" | "VANTAGE_POINT" | null;
  active: boolean;
  onboardedAt: string | null;
  _count: {
    accounts: number;
  };
}

export function TeamManager() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users?role=agent", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();
      setAgents(data.items || []);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
      toast({
        title: "Error",
        description: "Failed to load agents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTeam = async (userId: string, team: string | null) => {
    setUpdatingId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/team`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ team }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update team");
      }

      const data = await response.json();

      // Update local state
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === userId ? { ...agent, team: data.user.team } : agent
        )
      );

      toast({
        title: "✅ Team Updated",
        description: `Assigned to ${team || "UNASSIGNED"}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update team",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const getTeamBadge = (team: string | null) => {
    if (!team) {
      return <Badge variant="outline" className="text-muted-foreground">Unassigned</Badge>;
    }
    if (team === "IN_HOUSE") {
      return <Badge className="bg-blue-600 text-white">In-House</Badge>;
    }
    if (team === "VANTAGE_POINT") {
      return <Badge className="bg-purple-600 text-white">Vantage Point</Badge>;
    }
    return <Badge variant="outline">{team}</Badge>;
  };

  const getTeamStats = () => {
    const inHouse = agents.filter((a) => a.team === "IN_HOUSE").length;
    const vantagePoint = agents.filter((a) => a.team === "VANTAGE_POINT").length;
    const unassigned = agents.filter((a) => !a.team).length;
    return { inHouse, vantagePoint, unassigned, total: agents.length };
  };

  const stats = getTeamStats();

  return (
    <Card className="bg-card border-border rounded-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agent Team Management
            </CardTitle>
            <CardDescription>
              Assign agents to teams to track which partner organization recruited them
            </CardDescription>
          </div>
          <Button onClick={fetchAgents} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Team Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Agents</div>
          </div>
          <div className="bg-blue-600/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.inHouse}</div>
            <div className="text-xs text-blue-600/70">In-House</div>
          </div>
          <div className="bg-purple-600/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.vantagePoint}</div>
            <div className="text-xs text-purple-600/70">Vantage Point</div>
          </div>
          <div className="bg-amber-600/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.unassigned}</div>
            <div className="text-xs text-amber-600/70">Unassigned</div>
          </div>
        </div>

        {/* Agent List */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No agents found. Invite agents from the Recruit section.
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-sm text-muted-foreground">{agent.email}</div>
                    </div>
                    {!agent.active && (
                      <Badge variant="outline" className="text-red-500">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{agent._count.accounts} accounts</span>
                    {agent.onboardedAt && (
                      <span>
                        Joined {new Date(agent.onboardedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getTeamBadge(agent.team)}
                  
                  <Select
                    value={agent.team || "UNASSIGNED"}
                    onValueChange={(value) =>
                      updateTeam(agent.id, value === "UNASSIGNED" ? null : value)
                    }
                    disabled={updatingId === agent.id}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Assign team..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNASSIGNED">
                        <span className="text-muted-foreground">Unassigned</span>
                      </SelectItem>
                      <SelectItem value="IN_HOUSE">
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          In-House
                        </span>
                      </SelectItem>
                      <SelectItem value="VANTAGE_POINT">
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-purple-600" />
                          Vantage Point
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

