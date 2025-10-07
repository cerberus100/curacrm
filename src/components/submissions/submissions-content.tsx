"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { Send, AlertCircle, CheckCircle2, XCircle, FileText } from "lucide-react";
import { SubmissionDrawer } from "./submission-drawer";

interface Submission {
  id: string;
  status: string;
  httpCode: number | null;
  idempotencyKey: string;
  createdAt: string;
  account: {
    practiceName: string;
    ownerRep: {
      name: string;
    };
  };
  requestPayload: any;
  responsePayload: any;
  errorMessage: string | null;
}

export function SubmissionsContent() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/submissions");
        if (response.ok) {
          const data = await response.json();
          setSubmissions(data.submissions);
        }
      } catch (error) {
        console.error("Failed to fetch submissions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "failed":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-[color:var(--muted)]">
          Loading submissions...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Submissions</h1>
          <p className="text-[color:var(--muted)] mt-1">
            Track all CuraGenesis API submissions
          </p>
        </div>

        {submissions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Send className="h-12 w-12 mx-auto text-[color:var(--muted)] mb-4" />
              <p className="text-[color:var(--muted)]">No submissions yet. Send your first account to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <Card 
                key={submission.id}
                className="cursor-pointer transition-colors hover:bg-card/80"
                onClick={() => setSelectedSubmission(submission)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1">
                        {getStatusIcon(submission.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{submission.account.practiceName}</h3>
                          <Badge className={getStatusColor(submission.status)}>
                            {submission.status}
                          </Badge>
                          {submission.httpCode && (
                            <Badge variant="outline">
                              HTTP {submission.httpCode}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-[color:var(--muted)] text-xs">Rep</p>
                            <p className="font-medium">{submission.account.ownerRep.name}</p>
                          </div>
                          <div>
                            <p className="text-[color:var(--muted)] text-xs">Submitted</p>
                            <p className="font-medium">{formatDateTime(submission.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-[color:var(--muted)] text-xs">Idempotency Key</p>
                            <p className="font-mono text-xs">{submission.idempotencyKey.slice(0, 8)}...</p>
                          </div>
                        </div>
                        {submission.errorMessage && (
                          <p className="text-sm text-destructive mt-2">
                            Error: {submission.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedSubmission && (
        <SubmissionDrawer 
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </>
  );
}
