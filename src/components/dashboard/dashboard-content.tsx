"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import { TrendingUp, Users, DollarSign, ShoppingCart, Calendar, Target } from "lucide-react";
import { useKPIData } from "@/hooks/use-kpi-data";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts";
import { ConversionKPIsSection, SalesPerformanceSection, RetentionSection, OperationalSection, KPICard } from "./kpi-section";
import { SegmentBreakdown } from "./segment-breakdown";
import { PracticeSyncStatus } from "./practice-sync-status";
import { RealTimeNotifications } from "./real-time-notifications";
import { FinancialMetrics } from "./financial-metrics";
import type { DateRange } from "@/lib/kpi-types";
import { useCurrentUser } from "@/hooks/use-current-user";

export function DashboardContent() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [activeTab, setActiveTab] = useState<"overview" | "segments" | "team" | "practices">("overview");
  const { overview, geo, segments, leaderboard, isLoading, error } = useKPIData(dateRange);
  const { user, isAdmin } = useCurrentUser();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-[color:var(--muted)] mt-1">
            Comprehensive performance metrics and insights
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-1 border border-border rounded-lg p-1">
            <Button
              variant={activeTab === "overview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </Button>
            <Button
              variant={activeTab === "segments" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("segments")}
            >
              Segments
            </Button>
            <Button
              variant={activeTab === "team" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("team")}
            >
              Team
            </Button>
            {isAdmin && (
              <Button
                variant={activeTab === "practices" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("practices")}
              >
                Practices
              </Button>
            )}
          </div>
          <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="60d">Last 60 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-[color:var(--muted)]">Loading metrics...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load metrics. Please check your API configuration.</p>
          </CardContent>
        </Card>
      )}

      {/* Tab Content */}
      {overview && activeTab === "overview" && (
        <>
          {/* Real-time notifications */}
          <RealTimeNotifications />
          
          {/* Financial metrics for admin users */}
          {isAdmin && <FinancialMetrics />}
          
          {/* 1. Conversion Funnel */}
          <ConversionKPIsSection data={overview.conversion} />

          {/* 2. Sales Performance */}
          <SalesPerformanceSection data={overview.sales} />

          {/* 3. Retention & Growth */}
          <RetentionSection data={overview.retention} />

          {/* 4. Operational Health (Admin only) */}
          {isAdmin && <OperationalSection data={overview.operational} />}

          {/* Time Series Charts */}
          <div>
            <h2 className="text-xl font-bold mb-4">Trends Over Time</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
                <CardDescription>Daily sales over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overview.series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--foreground))"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    />
                    <YAxis 
                      stroke="hsl(var(--foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Sales"]}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Orders Trend</CardTitle>
                <CardDescription>Daily orders over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overview.series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--foreground))"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    />
                    <YAxis stroke="hsl(var(--foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      formatter={(value: number) => [formatNumber(value), "Orders"]}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Practices Added Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Practices Added</CardTitle>
                <CardDescription>New accounts over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overview.series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--foreground))"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    />
                    <YAxis stroke="hsl(var(--foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      formatter={(value: number) => [formatNumber(value), "Practices"]}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="practicesAdded" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Segments Tab */}
      {activeTab === "segments" && (
        <>
          {/* Geographic Data */}
          {geo && (
            <Card>
              <CardHeader>
                <CardTitle>Top States by Sales</CardTitle>
                <CardDescription>Geographic performance breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={geo.topStates}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis 
                        dataKey="stateCode" 
                        stroke="#94a3b8"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#94a3b8"
                        fontSize={12}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "#1e293b", 
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          color: "#e2e8f0"
                        }}
                        formatter={(value: number) => [formatCurrency(value), "Sales"]}
                      />
                      <Bar dataKey="sales" fill="#0E9FB7" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Segment Breakdown */}
          {segments && (
            <SegmentBreakdown 
              specialtyData={segments.bySpecialty} 
              leadSourceData={segments.byLeadSource}
            />
          )}
        </>
      )}

      {/* Team Tab */}
      {activeTab === "team" && leaderboard && (
        <Card>
          <CardHeader>
            <CardTitle>Rep Leaderboard</CardTitle>
            <CardDescription>Top performing sales representatives</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-sm">Rank</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Rep</th>
                    <th className="text-right py-3 px-4 font-medium text-sm">Practices</th>
                    <th className="text-right py-3 px-4 font-medium text-sm">Activation %</th>
                    <th className="text-right py-3 px-4 font-medium text-sm">Orders</th>
                    <th className="text-right py-3 px-4 font-medium text-sm">Sales</th>
                    <th className="text-right py-3 px-4 font-medium text-sm">AOV</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.leaderboard.map((entry) => (
                    <tr key={entry.repId} className="border-b border-border/50">
                      <td className="py-3 px-4 font-semibold">#{entry.rank}</td>
                      <td className="py-3 px-4">{entry.repName}</td>
                      <td className="py-3 px-4 text-right">{formatNumber(entry.practicesAdded)}</td>
                      <td className="py-3 px-4 text-right">{formatPercentage(entry.activationRate)}</td>
                      <td className="py-3 px-4 text-right">{formatNumber(entry.orders)}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(entry.sales)}</td>
                      <td className="py-3 px-4 text-right text-[color:var(--muted)]">{formatCurrency(entry.averageOrderValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Practices Tab */}
      {activeTab === "practices" && (
        <PracticeSyncStatus />
      )}
    </div>
  );
}
