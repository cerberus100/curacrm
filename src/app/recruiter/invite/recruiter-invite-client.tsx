"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Tabs component not available, using custom toggle
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, UserPlus, CheckCircle, XCircle, AlertCircle, ArrowLeft, Users } from "lucide-react";
import { getEmailAdapter } from "@/lib/provisioning/emailAdapter";
import HiresTable from "@/components/recruit/HiresTable";

interface InviteResult {
  email: string;
  status: 'invited' | 'exists' | 'error';
  message?: string;
  corpEmail?: string;
}

export function RecruiterInviteClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"single" | "bulk" | "hires">("single");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [corpEmailPreview, setCorpEmailPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  
  // Bulk invite state
  const [csvContent, setCsvContent] = useState("");
  const [bulkResults, setBulkResults] = useState<InviteResult[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Update corp email preview
  const updateCorpEmailPreview = async (first: string, last: string) => {
    if (first && last) {
      const emailAdapter = getEmailAdapter();
      const preview = await emailAdapter.generateAddress(first, last);
      setCorpEmailPreview(preview);
    } else {
      setCorpEmailPreview("");
    }
  };

  const handleSingleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/recruiter/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          personal_email: personalEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invite");
      }

      setResult({
        email: personalEmail,
        status: 'invited',
        corpEmail: data.user.corpEmail,
      });

      // Reset form
      setFirstName("");
      setLastName("");
      setPersonalEmail("");
      setCorpEmailPreview("");
    } catch (error) {
      setResult({
        email: personalEmail,
        status: 'error',
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkInvite = async () => {
    setBulkLoading(true);
    setBulkResults([]);

    try {
      // Parse CSV
      const lines = csvContent.trim().split('\n');
      const invites = lines
        .filter(line => line.trim())
        .map(line => {
          const [first_name, last_name, personal_email] = line.split(',').map(s => s.trim());
          return { first_name, last_name, personal_email };
        });

      const response = await fetch("/api/recruiter/invite/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invites }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process bulk invites");
      }

      setBulkResults(data.results);
    } catch (error) {
      console.error("Bulk invite error:", error);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold mb-2">Invite Sales Representatives</h1>
        <p className="text-muted-foreground">
          Create accounts for new sales reps with corporate email and CRM access
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
          <Button
            variant={activeTab === "single" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("single")}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Single Invite
          </Button>
          <Button
            variant={activeTab === "bulk" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("bulk")}
          >
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button
            variant={activeTab === "hires" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("hires")}
          >
            <Users className="mr-2 h-4 w-4" />
            Hires
          </Button>
        </div>

        {activeTab === "single" && (
          <Card className="bg-card border-border rounded-2xl">
            <CardHeader>
              <CardTitle>Invite New Rep</CardTitle>
              <CardDescription>
                Send an onboarding invitation to a new sales representative
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSingleInvite} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        updateCorpEmailPreview(e.target.value, lastName);
                      }}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        updateCorpEmailPreview(firstName, e.target.value);
                      }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="personalEmail">Personal Email</Label>
                  <Input
                    id="personalEmail"
                    type="email"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    placeholder="john.doe@gmail.com"
                    required
                  />
                </div>

                {corpEmailPreview && (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <Label className="text-sm text-muted-foreground">Corporate Email Preview</Label>
                    <p className="font-mono text-sm mt-1">{corpEmailPreview}</p>
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  <UserPlus className="mr-2 h-4 w-4" />
                  {loading ? "Sending Invite..." : "Send Invite"}
                </Button>
              </form>

              {result && (
                <Alert className={`mt-4 ${
                  result.status === 'invited' ? 'bg-green-50 border-green-200' : 
                  result.status === 'exists' ? 'bg-yellow-50 border-yellow-200' : 
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {result.status === 'invited' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : result.status === 'exists' ? (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <AlertDescription>
                      {result.status === 'invited' && (
                        <>
                          Successfully invited <strong>{result.email}</strong>
                          <br />
                          Corporate email: <strong>{result.corpEmail}</strong>
                        </>
                      )}
                      {result.status === 'exists' && `User with email ${result.email} already exists`}
                      {result.status === 'error' && result.message}
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "bulk" && (
          <Card className="bg-card border-border rounded-2xl">
            <CardHeader>
              <CardTitle>Bulk Invite</CardTitle>
              <CardDescription>
                Upload a CSV file with multiple reps to invite
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>CSV Format</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Each row should contain: first_name,last_name,personal_email
                </p>
                <pre className="bg-muted/50 p-3 rounded-lg mt-2 text-xs">
                  John,Doe,john.doe@gmail.com
                  Jane,Smith,jane.smith@yahoo.com
                  Bob,Johnson,bob.j@hotmail.com
                </pre>
              </div>

              <div className="space-y-2">
                <Label htmlFor="csvFile">Upload CSV File</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                />
              </div>

              {csvContent && (
                <div>
                  <Label>CSV Preview</Label>
                  <textarea
                    className="w-full h-32 p-3 border rounded-lg bg-muted/50 text-sm font-mono"
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                  />
                </div>
              )}

              <Button
                onClick={handleBulkInvite}
                disabled={!csvContent || bulkLoading}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {bulkLoading ? "Processing..." : "Process Bulk Invites"}
              </Button>

              {bulkResults.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Results</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {bulkResults.map((result, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg flex items-center gap-3 ${
                          result.status === 'invited' ? 'bg-green-50' :
                          result.status === 'exists' ? 'bg-yellow-50' :
                          'bg-red-50'
                        }`}
                      >
                        {result.status === 'invited' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : result.status === 'exists' ? (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{result.email}</p>
                          {result.corpEmail && (
                            <p className="text-xs text-muted-foreground">
                              Corp: {result.corpEmail}
                            </p>
                          )}
                          {result.message && (
                            <p className="text-xs text-red-600">{result.message}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "hires" && <HiresTable />}
      </div>
    </div>
  );
}
