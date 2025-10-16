"use client";

import { useEffect, useState } from "react";

export function SesStatusRow() {
  const [status, setStatus] = useState<{ mode: string; region: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/ses/status");
        if (!res.ok) throw new Error("Failed to load SES status");
        const data = await res.json();
        setStatus({ mode: data.mode, region: data.region });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    })();
  }, []);

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[color:var(--muted)]">SES ({status?.region || "unknown"})</span>
      {error ? (
        <span className="text-yellow-400 font-medium">Check Config</span>
      ) : status?.mode === "PRODUCTION" ? (
        <span className="text-green-400 font-medium">Production</span>
      ) : (
        <span className="text-yellow-400 font-medium">Sandbox</span>
      )}
    </div>
  );
}


