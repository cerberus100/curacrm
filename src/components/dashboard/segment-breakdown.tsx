"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ['#0E9FB7', '#007F96', '#006D80', '#4DA3B0', '#0891A5'];

export function SegmentBreakdown({ specialtyData, leadSourceData }: { specialtyData?: any[]; leadSourceData?: any[] }) {
  if (!specialtyData && !leadSourceData) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* By Specialty */}
      {specialtyData && specialtyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sales by Specialty</CardTitle>
            <CardDescription>Performance across medical specialties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={specialtyData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number"
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    type="category"
                    dataKey="segment"
                    stroke="hsl(var(--foreground))"
                    fontSize={11}
                    width={120}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "sales") return [formatCurrency(value), "Sales"];
                      if (name === "orders") return [formatNumber(value), "Orders"];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="sales" radius={[0, 8, 8, 0]}>
                    {specialtyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Data Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-2">Specialty</th>
                    <th className="text-right py-2">Sales</th>
                    <th className="text-right py-2">Orders</th>
                    <th className="text-right py-2">Practices</th>
                    <th className="text-right py-2">AOV</th>
                  </tr>
                </thead>
                <tbody>
                  {specialtyData.map((item, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-2">{item.segment}</td>
                      <td className="text-right">{formatCurrency(item.sales)}</td>
                      <td className="text-right">{formatNumber(item.orders)}</td>
                      <td className="text-right">{formatNumber(item.practices)}</td>
                      <td className="text-right">{formatCurrency(item.avgOrderValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* By Lead Source */}
      {leadSourceData && leadSourceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sales by Lead Source</CardTitle>
            <CardDescription>Channel effectiveness</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadSourceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number"
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    type="category"
                    dataKey="segment"
                    stroke="hsl(var(--foreground))"
                    fontSize={11}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Sales"]}
                  />
                  <Bar dataKey="sales" radius={[0, 8, 8, 0]}>
                    {leadSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Data Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-2">Source</th>
                    <th className="text-right py-2">Sales</th>
                    <th className="text-right py-2">Orders</th>
                    <th className="text-right py-2">Practices</th>
                  </tr>
                </thead>
                <tbody>
                  {leadSourceData.map((item, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-2">{item.segment}</td>
                      <td className="text-right">{formatCurrency(item.sales)}</td>
                      <td className="text-right">{formatNumber(item.orders)}</td>
                      <td className="text-right">{formatNumber(item.practices)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
