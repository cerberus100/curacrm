"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShoppingCart, 
  Calendar, 
  Target,
  Activity,
  Percent,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap
} from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
}

export function KPICard({ title, value, subtitle, icon, trend }: KPICardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-[color:var(--muted)]">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-[color:var(--muted)] mt-1">{subtitle}</p>
        )}
        {trend && (
          <p className="text-xs text-green-400 mt-1">{trend}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ConversionKPIsSection({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Conversion Funnel</h2>
        <p className="text-sm text-[color:var(--muted)]">Track practice onboarding efficiency</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Practices Added"
          value={formatNumber(data.practicesAdded || 0)}
          icon={<Users />}
          subtitle="New accounts created"
        />
        <KPICard
          title="Send Rate"
          value={formatPercentage(data.sendToCuraGenesisRate || 0)}
          icon={<TrendingUp />}
          subtitle="Submitted to CuraGenesis"
        />
        <KPICard
          title="Activation Rate"
          value={formatPercentage(data.activationRate || 0)}
          icon={<Target />}
          subtitle="Practices with ≥1 order"
        />
        <KPICard
          title="Days to First Order"
          value={(data.avgDaysToFirstOrder || 0).toFixed(1)}
          icon={<Clock />}
          subtitle="Average onboarding time"
        />
        <KPICard
          title="30-Day Drop-Off"
          value={formatPercentage(data.dropOffRate30d || 0)}
          icon={<AlertCircle />}
          subtitle="No orders after 30 days"
        />
      </div>
    </div>
  );
}

export function SalesPerformanceSection({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Sales Performance</h2>
        <p className="text-sm text-[color:var(--muted)]">Revenue and order metrics</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Sales"
          value={formatCurrency(data.totalSalesVolume || 0)}
          icon={<DollarSign />}
          subtitle={data.totalSalesArea ? `${formatNumber(data.totalSalesArea)} sq cm` : undefined}
        />
        <KPICard
          title="Average Order Value"
          value={formatCurrency(data.averageOrderValue || 0)}
          icon={<TrendingUp />}
          subtitle={data.averageOrderSize ? `${formatNumber(data.averageOrderSize)} sq cm avg` : undefined}
        />
        <KPICard
          title="Orders / Practice"
          value={(data.ordersPerActivePractice || 0).toFixed(1)}
          icon={<Activity />}
          subtitle="Engagement depth"
        />
        <KPICard
          title="New vs Repeat"
          value={`${data.newOrders || 0} / ${data.repeatOrders || 0}`}
          icon={<ShoppingCart />}
          subtitle="Acquisition vs retention"
        />
        <KPICard
          title="Revenue per Rep"
          value={formatCurrency(data.revenuePerRep || 0)}
          icon={<DollarSign />}
          subtitle="Average per sales rep"
        />
      </div>
    </div>
  );
}

export function RetentionSection({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Retention & Growth</h2>
        <p className="text-sm text-[color:var(--muted)]">Long-term account health</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="90-Day Retention"
          value={formatPercentage(data.retention90d || 0)}
          icon={<Target />}
          subtitle="≥2 orders in 90 days"
        />
        <KPICard
          title="Monthly Active"
          value={formatNumber(data.monthlyActivePractices || 0)}
          icon={<Users />}
          subtitle="Practices (MAP)"
        />
        <KPICard
          title="Churn Rate"
          value={formatPercentage(data.churnRate || 0)}
          icon={<AlertCircle />}
          subtitle="Lost this month"
        />
        <KPICard
          title="Reorder Interval"
          value={`${(data.avgReorderInterval || 0).toFixed(0)}d`}
          icon={<Calendar />}
          subtitle="Average days between"
        />
        <KPICard
          title="Lifetime Value"
          value={formatCurrency(data.lifetimeValue || 0)}
          icon={<TrendingUp />}
          subtitle="Estimated LTV"
        />
      </div>
    </div>
  );
}

export function OperationalSection({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Operational Health</h2>
        <p className="text-sm text-[color:var(--muted)]">API reliability and system performance</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="API Success Rate"
          value={formatPercentage(data.apiSuccessRate || 0)}
          icon={<CheckCircle2 />}
          subtitle={`${data.successfulSubmissions || 0} / ${data.totalSubmissions || 0}`}
        />
        <KPICard
          title="Avg API Latency"
          value={`${data.avgApiLatency || 0}ms`}
          icon={<Zap />}
          subtitle="Response time"
        />
        <KPICard
          title="Duplicates Prevented"
          value={formatNumber(data.duplicatesPrevented || 0)}
          icon={<AlertCircle />}
          subtitle="Data hygiene score"
        />
        <KPICard
          title="Failed Submissions"
          value={formatNumber(data.failedSubmissions || 0)}
          icon={<AlertCircle />}
          subtitle={formatPercentage(1 - (data.apiSuccessRate || 0))}
        />
      </div>
    </div>
  );
}
