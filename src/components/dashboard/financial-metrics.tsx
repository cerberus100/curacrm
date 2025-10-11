"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Package } from "lucide-react";

interface FinancialData {
  totalRevenue: number;
  totalCOGS: number;
  grossMargin: number;
  grossMarginPercent: number;
}

export function FinancialMetrics() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      const response = await fetch("/api/kpi/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateRange: "30d" }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch financial data");
      }

      const result = await response.json();
      
      // Extract financial data if present (admin only)
      if (result.financials && result.financials.totalRevenue !== undefined) {
        setData({
          totalRevenue: result.financials.totalRevenue,
          totalCOGS: result.financials.totalCOGS,
          grossMargin: result.financials.grossMargin,
          grossMarginPercent: result.financials.grossMarginPercent,
        });
      }
    } catch (error) {
      console.error("Error fetching financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return null; // No financial data available (non-admin user)
  }

  const metrics = [
    {
      title: "Total Revenue",
      value: formatCurrency(data.totalRevenue),
      icon: DollarSign,
      description: "Last 30 days",
      trend: "up",
    },
    {
      title: "Cost of Goods Sold",
      value: formatCurrency(data.totalCOGS),
      icon: Package,
      description: "Product costs",
      trend: "neutral",
    },
    {
      title: "Gross Margin",
      value: formatCurrency(data.grossMargin),
      icon: TrendingUp,
      description: "Revenue - COGS",
      trend: data.grossMargin > 0 ? "up" : "down",
    },
    {
      title: "Gross Margin %",
      value: `${data.grossMarginPercent.toFixed(1)}%`,
      icon: TrendingUp,
      description: "Profit percentage",
      trend: data.grossMarginPercent > 50 ? "up" : "down",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Financial Overview</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Admin-only financial metrics with cost analysis
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${
                  metric.trend === "up" ? "text-green-600" : 
                  metric.trend === "down" ? "text-red-600" : 
                  "text-muted-foreground"
                }`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
