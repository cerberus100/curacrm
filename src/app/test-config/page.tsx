"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestConfigPage() {
  const [configResult, setConfigResult] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug/check-config");
      const data = await response.json();
      setConfigResult(data);
    } catch (error) {
      setConfigResult({ error: error.message });
    }
    setLoading(false);
  };

  const testSync = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/kpi/sync-practices");
      const data = await response.json();
      setSyncResult(data);
    } catch (error) {
      setSyncResult({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Configuration Test Page</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Environment Check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkConfig} disabled={loading}>
            Check Configuration
          </Button>
          
          {configResult && (
            <pre className="bg-muted p-4 rounded overflow-auto text-xs">
              {JSON.stringify(configResult, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testSync} disabled={loading}>
            Test Practice Sync
          </Button>
          
          {syncResult && (
            <pre className="bg-muted p-4 rounded overflow-auto text-xs">
              {JSON.stringify(syncResult, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
