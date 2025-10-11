"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

type Rep = { id: string; name: string; email: string };

export default function AssignRep({
  accountId,
  currentRepId,
}: {
  accountId: string;
  currentRepId?: string | null;
}) {
  const { isAdmin } = useCurrentUser();
  const [reps, setReps] = useState<Rep[]>([]);
  const [value, setValue] = useState(currentRepId || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    
    (async () => {
      try {
        const res = await fetch("/api/users?role=agent", {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setReps(data.items || []);
        }
      } catch (error) {
        console.error("Failed to fetch reps:", error);
      }
    })();
  }, [isAdmin]);

  if (!isAdmin) return null;

  async function assign(repId: string) {
    if (!repId) return;
    
    setBusy(true);
    setMsg(null);
    
    try {
      const res = await fetch(`/api/accounts/${accountId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ repId }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to assign");
      }
      
      setMsg("✅ Assigned");
      setValue(repId);
      
      // Clear message after 2 seconds
      setTimeout(() => setMsg(null), 2000);
    } catch (error: any) {
      setMsg(`❌ ${error.message || error}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="rounded-md border border-border bg-card px-2 py-1 text-sm"
        value={value}
        onChange={(e) => assign(e.target.value)}
        disabled={busy}
      >
        <option value="">{busy ? "Assigning..." : "Unassigned"}</option>
        {reps.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name || r.email}
          </option>
        ))}
      </select>
      {msg && (
        <span className="text-xs text-muted-foreground">{msg}</span>
      )}
    </div>
  );
}
