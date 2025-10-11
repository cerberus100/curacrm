"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface SubmissionDrawerProps {
  submission: any;
  onClose: () => void;
}

export function SubmissionDrawer({ submission, onClose }: SubmissionDrawerProps) {
  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
      onClick={onClose}
    >
      <div 
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-card border-l border-border shadow-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{submission.account.practiceName}</h2>
              <p className="text-[color:var(--muted)] mt-1">
                Submission Details
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={
                  submission.status === "SUCCESS" 
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : submission.status === "FAILED"
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                }>
                  {submission.status}
                </Badge>
                {submission.httpCode && (
                  <Badge variant="outline">HTTP {submission.httpCode}</Badge>
                )}
              </div>
              <div className="text-sm space-y-1">
                <p><span className="text-[color:var(--muted)]">Rep:</span> {submission.account.ownerRep?.name || "Unassigned"}</p>
                <p><span className="text-[color:var(--muted)]">Submitted:</span> {formatDateTime(submission.createdAt)}</p>
                <p><span className="text-[color:var(--muted)]">Idempotency Key:</span> <code className="text-xs">{submission.idempotencyKey}</code></p>
              </div>
              {submission.errorMessage && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                  <strong>Error:</strong> {submission.errorMessage}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request */}
          <Card>
            <CardHeader>
              <CardTitle>Request Payload</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-background border border-border rounded-lg p-4 text-xs overflow-x-auto">
                {JSON.stringify(submission.requestPayload, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Response */}
          {submission.responsePayload && (
            <Card>
              <CardHeader>
                <CardTitle>Response Payload</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-background border border-border rounded-lg p-4 text-xs overflow-x-auto">
                  {JSON.stringify(submission.responsePayload, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
