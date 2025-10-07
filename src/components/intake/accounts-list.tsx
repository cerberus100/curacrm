"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { Building2 } from "lucide-react";

interface Account {
  id: string;
  practiceName: string;
  specialty: string;
  city: string | null;
  state: string;
  status: string;
  ownerRep: {
    name: string;
  };
  updatedAt: string;
  _count: {
    contacts: number;
    submissions: number;
  };
}

export function AccountsList({ onEdit, refreshKey }: { onEdit: (id: string) => void; refreshKey: number }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/accounts");
        if (response.ok) {
          const data = await response.json();
          setAccounts(data.accounts);
        }
      } catch (error) {
        console.error("Failed to fetch accounts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, [refreshKey]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
      case "acknowledged":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "draft":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "ready_to_send":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "failed":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-[color:var(--muted)]/10";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-[color:var(--muted)]">
          Loading accounts...
        </CardContent>
      </Card>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-[color:var(--muted)] mb-4" />
          <p className="text-[color:var(--muted)]">No accounts yet. Create your first practice account to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {accounts.map((account) => (
        <Card 
          key={account.id}
          className="cursor-pointer transition-colors hover:bg-card/80"
          onClick={() => onEdit(account.id)}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{account.practiceName}</h3>
                  <Badge className={getStatusColor(account.status)}>
                    {account.status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-[color:var(--muted)] text-xs">Specialty</p>
                    <p className="font-medium">{account.specialty}</p>
                  </div>
                  <div>
                    <p className="text-[color:var(--muted)] text-xs">Location</p>
                    <p className="font-medium">
                      {account.city ? `${account.city}, ` : ""}{account.state}
                    </p>
                  </div>
                  <div>
                    <p className="text-[color:var(--muted)] text-xs">Rep</p>
                    <p className="font-medium">{account.ownerRep.name}</p>
                  </div>
                  <div>
                    <p className="text-[color:var(--muted)] text-xs">Contacts / Submissions</p>
                    <p className="font-medium">
                      {account._count.contacts} / {account._count.submissions}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-[color:var(--muted)] mt-3">
                  Updated {formatDateTime(account.updatedAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
