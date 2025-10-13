"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { Building2 } from "lucide-react";
import AssignRep from "@/components/accounts/AssignRep";
import { useCurrentUser } from "@/hooks/use-current-user";

interface Account {
  id: string;
  practiceName: string;
  specialty: string;
  city: string | null;
  state: string;
  status: string;
  ownerRep: {
    id: string;
    name: string;
    team?: string | null;
  } | null;
  updatedAt: string;
  _count: {
    contacts: number;
    submissions: number;
  };
}

export function AccountsList({ onEdit, refreshKey }: { onEdit: (id: string) => void; refreshKey: number }) {
  const { isAdmin } = useCurrentUser();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/accounts");
        if (response.ok) {
          const data = await response.json();
          // Defensive check - ensure data.accounts exists and is an array
          if (data && Array.isArray(data.accounts)) {
            setAccounts(data.accounts);
          } else {
            console.error("Invalid accounts response:", data);
            setAccounts([]);
          }
        } else {
          console.error("Intake load failed - HTTP", response.status, await response.text());
          setAccounts([]);
        }
      } catch (error) {
        console.error("Intake load failed", error);
        setAccounts([]);
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
                    <p className="text-[color:var(--muted)] text-xs">Rep{(isAdmin || account.ownerRep?.team === "VANTAGE_POINT") && account.ownerRep?.team && " / Team"}</p>
                    {isAdmin ? (
                      <div className="flex flex-col gap-1">
                        <AssignRep
                          accountId={account.id}
                          currentRepId={account.ownerRep?.id}
                        />
                        {account.ownerRep?.team && (
                          <Badge variant="outline" className="text-[10px] w-fit">
                            {account.ownerRep.team === "IN_HOUSE" ? "In-House" : "Vantage Point"}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <p className="font-medium">{account.ownerRep?.name || "Unassigned"}</p>
                        {account.ownerRep?.team === "VANTAGE_POINT" && (
                          <Badge variant="outline" className="text-[10px] w-fit bg-purple-600/10 text-purple-600">
                            Vantage Point
                          </Badge>
                        )}
                      </div>
                    )}
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
