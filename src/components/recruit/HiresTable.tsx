"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

type Hire = {
  id: string;
  name: string;
  personalEmail: string;
  corpEmail: string | null;
  onboardStatus: string;
  docs: {
    w9: string;
    baa: string;
    hire_agreement: string;
    allSigned: boolean;
  };
  provision: string;
  provisionError: string | null;
  updatedAt: string;
};

export default function HiresTable() {
  const [rows, setRows] = useState<Hire[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  async function load() {
    try {
      setLoading(true);
      const r = await fetch("/api/recruiter/hires", {
        credentials: "include",
        cache: "no-store",
      });
      const j = await r.json();
      setRows(j.items ?? []);
    } catch (error) {
      console.error("Failed to load hires:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [refreshTick]);

  // Poll every 10s
  useEffect(() => {
    const t = setInterval(() => setRefreshTick((x) => x + 1), 10000);
    return () => clearInterval(t);
  }, []);

  async function retryProvision() {
    setBusyId("all");
    try {
      const r = await fetch("/api/provision/run", {
        method: "POST",
        credentials: "include",
      });
      if (r.ok) {
        // It processes one pending job at a time; poll to update
        setRefreshTick((x) => x + 1);
      }
    } catch (error) {
      console.error("Provision retry failed:", error);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="bg-card border-border rounded-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Hires</CardTitle>
            <CardDescription>
              View onboarding status for all recruited reps
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshTick((x) => x + 1)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              size="sm"
              disabled={busyId === "all"}
              onClick={retryProvision}
            >
              Retry Provisioning
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="text-left border-b">
                <th className="py-3 pr-4 font-medium">Name</th>
                <th className="py-3 pr-4 font-medium">Personal Email</th>
                <th className="py-3 pr-4 font-medium">Corp Email</th>
                <th className="py-3 pr-4 font-medium">Documents</th>
                <th className="py-3 pr-4 font-medium">Onboarding</th>
                <th className="py-3 pr-4 font-medium">Provision</th>
                <th className="py-3 pr-0 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-8 text-center text-muted-foreground" colSpan={7}>
                    Loading hires...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    className="py-8 text-center text-muted-foreground"
                    colSpan={7}
                  >
                    No hires yet. Invite reps to get started.
                  </td>
                </tr>
              ) : (
                rows.map((h) => (
                  <tr key={h.id} className="border-b hover:bg-accent/50">
                    <td className="py-3 pr-4 font-medium">{h.name}</td>
                    <td className="py-3 pr-4">{h.personalEmail}</td>
                    <td className="py-3 pr-4">
                      {h.corpEmail ? (
                        <span className="text-emerald-400">{h.corpEmail}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        <DocChip label="W-9" status={h.docs.w9} />
                        <DocChip label="BAA" status={h.docs.baa} />
                        <DocChip label="Hire" status={h.docs.hire_agreement} />
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={h.onboardStatus} />
                    </td>
                    <td className="py-3 pr-4">
                      <ProvisionBadge
                        status={h.provision}
                        error={h.provisionError}
                      />
                    </td>
                    <td className="py-3 pr-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRefreshTick((x) => x + 1)}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DocChip({ label, status }: { label: string; status: string }) {
  const color =
    status === "SIGNED"
      ? "bg-emerald-600/20 text-emerald-300 border-emerald-600/30"
      : status === "sent" || status === "PENDING"
      ? "bg-amber-600/20 text-amber-300 border-amber-600/30"
      : status === "rejected" || status === "FAILED"
      ? "bg-red-600/20 text-red-300 border-red-600/30"
      : "bg-slate-600/20 text-slate-300 border-slate-600/30";

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {label}: {status.toLowerCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, string> = {
    INVITED: "bg-slate-600/20 text-slate-300 border-slate-600/30",
    DOCS_SENT: "bg-amber-600/20 text-amber-300 border-amber-600/30",
    DOCS_SIGNED: "bg-emerald-600/20 text-emerald-300 border-emerald-600/30",
    PROVISIONING_OK: "bg-sky-600/20 text-sky-300 border-sky-600/30",
    PROVISIONING_FAILED: "bg-red-600/20 text-red-300 border-red-600/30",
    ACTIVE: "bg-emerald-700/30 text-emerald-200 border-emerald-700/40",
    PENDING: "bg-amber-600/20 text-amber-300 border-amber-600/30",
  };

  const cls =
    statusMap[status] || "bg-slate-600/20 text-slate-300 border-slate-600/30";

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${cls}`}>
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}

function ProvisionBadge({
  status,
  error,
}: {
  status: string;
  error: string | null;
}) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center rounded-md border border-emerald-600/30 bg-emerald-600/20 px-2 py-1 text-xs font-medium text-emerald-300">
        ✓ Success
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span
        title={error ?? "Provisioning failed"}
        className="inline-flex items-center rounded-md border border-red-600/30 bg-red-600/20 px-2 py-1 text-xs font-medium text-red-300 cursor-help"
      >
        ✗ Failed
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center rounded-md border border-amber-600/30 bg-amber-600/20 px-2 py-1 text-xs font-medium text-amber-300">
        ⏳ Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md border border-slate-600/30 bg-slate-600/20 px-2 py-1 text-xs font-medium text-slate-300">
      N/A
    </span>
  );
}

