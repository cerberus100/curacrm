"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileSpreadsheet } from "lucide-react";
import { AccountsList } from "./accounts-list";
import { AccountForm } from "./account-form";
import { CSVBulkImport } from "./csv-bulk-import";

export function IntakeContent() {
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreate = () => {
    setSelectedAccountId(null);
    setShowForm(true);
    setShowBulkImport(false);
  };

  const handleBulkImport = () => {
    setShowForm(false);
    setShowBulkImport(true);
  };

  const handleEdit = (accountId: string) => {
    setSelectedAccountId(accountId);
    setShowForm(true);
    setShowBulkImport(false);
  };

  const handleClose = () => {
    setShowForm(false);
    setShowBulkImport(false);
    setSelectedAccountId(null);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {!showForm && !showBulkImport ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Practice Intake</h1>
              <p className="text-[color:var(--muted)] mt-1">
                Manage practice accounts and contacts
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBulkImport} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                CSV Import
              </Button>
              <Button onClick={handleCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                New Account
              </Button>
            </div>
          </div>

          <AccountsList onEdit={handleEdit} refreshKey={refreshKey} />
        </>
      ) : showBulkImport ? (
        <>
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={handleClose}>
              ← Back to Accounts
            </Button>
            <div>
              <h1 className="text-3xl font-bold">CSV Bulk Import</h1>
              <p className="text-[color:var(--muted)] mt-1">
                Upload and send multiple accounts at once
              </p>
            </div>
          </div>
          <CSVBulkImport />
        </>
      ) : (
        <AccountForm 
          accountId={selectedAccountId} 
          onClose={handleClose}
        />
      )}
    </div>
  );
}
