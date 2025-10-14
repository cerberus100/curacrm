"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Send, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ImportResult {
  success: Array<{ row: number; accountId: string; practiceName: string }>;
  failed: Array<{ row: number; practice: string; error: string }>;
  total: number;
}

interface SendResult {
  success: Array<{ accountId: string; practiceName: string }>;
  failed: Array<{ accountId: string; practiceName: string; error: string }>;
  total: number;
}

export function CSVBulkImport() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [progress, setProgress] = useState(0);

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      
      rows.push(row);
    }

    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setImportResult(null);
      setSendResult(null);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setProgress(0);

    try {
      // Read file
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast({
          title: "Empty File",
          description: "CSV file contains no data",
          variant: "destructive",
        });
        setIsImporting(false);
        return;
      }

      // Import to database
      const response = await fetch("/api/accounts/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows,
          ownerRepId: user?.id || "",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setImportResult(data.results);
        toast({
          title: "✅ Import Complete",
          description: data.message,
        });
      } else {
        toast({
          title: "Import Failed",
          description: data.error || "Failed to import CSV",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process CSV file",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  };

  const handleSendAll = async () => {
    if (!importResult || importResult.success.length === 0) {
      toast({
        title: "No Accounts",
        description: "Import accounts first before sending",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    setProgress(0);

    try {
      const accountIds = importResult.success.map(s => s.accountId);
      
      // Send in batches of 5
      const response = await fetch("/api/accounts/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountIds }),
      });

      const data = await response.json();

      if (response.ok) {
        setSendResult(data.results);
        toast({
          title: "✅ Bulk Send Complete",
          description: data.message,
        });
      } else {
        toast({
          title: "Send Failed",
          description: data.error || "Failed to send accounts",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send accounts",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      setProgress(0);
    }
  };

  const downloadTemplate = () => {
    const template = `practice_name,specialty,state,npi_org,phone,email,address_line1,address_line2,city,zip,contact_full_name,contact_type,contact_email,contact_phone
ABC Medical Center,Family Medicine,CA,1234567890,(555) 123-4567,contact@abc.com,123 Main St,Suite 100,San Francisco,94102,Dr. John Smith,clinician,jsmith@abc.com,(555) 987-6543
XYZ Health Group,Cardiology,NY,9876543210,(212) 555-0001,info@xyz.com,456 Park Ave,,New York,10001,Dr. Sarah Johnson,owner_physician,sjohnson@xyz.com,(212) 555-0002`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "curagenesis_import_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>CSV Bulk Import</CardTitle>
            <CardDescription>
              Upload multiple accounts at once from a CSV file
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label 
              htmlFor="csv-upload" 
              className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-lg p-6 hover:border-primary transition-colors"
            >
              <FileSpreadsheet className="h-8 w-8 text-[color:var(--muted)]" />
              <div className="flex-1">
                <p className="font-medium">
                  {file ? file.name : "Choose CSV file"}
                </p>
                <p className="text-sm text-[color:var(--muted)] mt-1">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : "Click to browse or drag and drop"}
                </p>
              </div>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Actions */}
        {file && !importResult && (
          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={isImporting}>
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "Importing..." : "Import Accounts"}
            </Button>
            <Button variant="outline" onClick={() => setFile(null)}>
              Cancel
            </Button>
          </div>
        )}

        {/* Import Results */}
        {importResult && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Import Complete</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                    ✓ {importResult.success.length} Imported
                  </Badge>
                  {importResult.failed.length > 0 && (
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                      ✗ {importResult.failed.length} Failed
                    </Badge>
                  )}
                </div>

                {importResult.failed.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                    <p className="text-xs font-semibold text-destructive">Failed Rows:</p>
                    {importResult.failed.map((fail, idx) => (
                      <div key={idx} className="text-xs bg-destructive/10 rounded p-2">
                        <p>Row {fail.row}: {fail.practice}</p>
                        <p className="text-[color:var(--muted)]">{fail.error}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Send All Valid */}
        {importResult && importResult.success.length > 0 && !sendResult && (
          <div className="flex gap-2">
            <Button onClick={handleSendAll} disabled={isSending}>
              <Send className="h-4 w-4 mr-2" />
              {isSending ? `Sending... (${progress}%)` : `Send All Valid (${importResult.success.length})`}
            </Button>
          </div>
        )}

        {/* Send Results */}
        {sendResult && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Bulk Send Complete</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                    ✓ {sendResult.success.length} Sent
                  </Badge>
                  {sendResult.failed.length > 0 && (
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                      ✗ {sendResult.failed.length} Failed
                    </Badge>
                  )}
                </div>

                {sendResult.failed.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                    <p className="text-xs font-semibold text-destructive">Failed Submissions:</p>
                    {sendResult.failed.map((fail, idx) => (
                      <div key={idx} className="text-xs bg-destructive/10 rounded p-2">
                        <p>{fail.practiceName}</p>
                        <p className="text-[color:var(--muted)]">{fail.error}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* CSV Format Reference */}
        <div className="border border-border rounded-lg p-4 bg-accent/5">
          <h4 className="font-medium mb-2 text-sm">Required CSV Columns:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-[color:var(--muted)]">
            <div>
              <p className="font-mono">practice_name *</p>
              <p className="font-mono">specialty *</p>
              <p className="font-mono">state * (2-letter)</p>
              <p className="font-mono">npi_org (10 digits)</p>
              <p className="font-mono">phone</p>
              <p className="font-mono">email</p>
            </div>
            <div>
              <p className="font-mono">address_line1</p>
              <p className="font-mono">address_line2</p>
              <p className="font-mono">city</p>
              <p className="font-mono">zip</p>
              <p className="font-mono">contact_full_name *</p>
              <p className="font-mono">contact_type *</p>
            </div>
            <div className="col-span-2">
              <p className="font-mono">contact_email</p>
              <p className="font-mono">contact_phone</p>
            </div>
          </div>
          <p className="text-xs text-[color:var(--muted)] mt-2">
            * Required fields
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
