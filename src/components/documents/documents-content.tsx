"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";

interface Document {
  id: string;
  type: string;
  fileName: string;
  status: string;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function DocumentsContent() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents/my");
      if (!response.ok) throw new Error("Failed to fetch documents");
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "signed":
      case "approved":
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <FileText className="h-4 w-4 text-[color:var(--muted)]" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      signed: "default",
      approved: "default",
      pending: "secondary",
      rejected: "destructive",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      baa: "Business Associate Agreement",
      w9: "IRS Form W-9",
      contract: "Contract",
      other: "Other Document",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Documents</h1>
        <p className="text-[color:var(--muted)] mt-1">
          View and manage your independent contractor documents
        </p>
      </div>

      {/* Onboarding Status */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Status</CardTitle>
            <CardDescription>Your compliance document completion status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                {user.baaCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-400" />
                )}
                <div>
                  <div className="font-medium">Business Associate Agreement</div>
                  <div className="text-xs text-[color:var(--muted)]">
                    {user.baaCompleted ? "✓ Completed" : "Pending"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                {user.w9Completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-400" />
                )}
                <div>
                  <div className="font-medium">IRS Form W-9</div>
                  <div className="text-xs text-[color:var(--muted)]">
                    {user.w9Completed ? "✓ Completed" : "Pending"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Document History</CardTitle>
          <CardDescription>All your submitted and signed documents</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-[color:var(--muted)]">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-[color:var(--muted)]">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No documents found</p>
              <p className="text-sm mt-1">Documents will appear here after you complete onboarding</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-card/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(doc.status)}
                    <div>
                      <div className="font-medium">{getDocumentTypeLabel(doc.type)}</div>
                      <div className="text-sm text-[color:var(--muted)]">
                        {doc.fileName}
                        {doc.signedAt && (
                          <span className="ml-2">
                            • Signed {new Date(doc.signedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(doc.status)}
                    <button
                      className="p-2 hover:bg-primary/10 rounded transition-colors"
                      title="Download document"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Questions about your documents</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[color:var(--muted)]">
            If you have questions about your documents or need to update any information,
            please contact your administrator or reach out to support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

