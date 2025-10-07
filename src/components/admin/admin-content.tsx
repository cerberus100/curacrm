"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export function AdminContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-[color:var(--muted)] mt-1">
          System administration and settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Application status and diagnostics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-[color:var(--muted)]">Database</span>
              <span className="text-green-400 font-medium">Connected</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-[color:var(--muted)]">CuraGenesis API</span>
              <span className="text-green-400 font-medium">Configured</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[color:var(--muted)]">Metrics API</span>
              <span className="text-green-400 font-medium">Configured</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Configuration status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>DATABASE_URL</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>CURAGENESIS_API_BASE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>CURAGENESIS_API_KEY</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>CG_METRICS_API_KEY</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-8 text-center">
          <Settings className="h-12 w-12 mx-auto text-[color:var(--muted)] mb-3" />
          <p className="text-[color:var(--muted)]">
            Additional admin features coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
