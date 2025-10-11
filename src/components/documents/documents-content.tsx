"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, CheckCircle2, Clock, XCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { DocumentUploadAdmin } from "./DocumentUploadAdmin";

interface Document {
  id: string;
  title: string;
  type: string;
  description: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  sentAt?: string;
  viewedAt?: string | null;
  status?: string;
  signedAt?: string | null;
  updatedAt?: string;
}

export function DocumentsContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAdmin } = useCurrentUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents/my", {
        credentials: "include",
        cache: "no-store",
      });
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

  const handleDownload = (documentId: string) => {
    window.open(`/api/documents/download?id=${documentId}`, "_blank");
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
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
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">My Documents</h1>
        <p className="text-[color:var(--muted)] mt-1">
          View and manage your independent contractor documents
        </p>
      </div>

      {/* Admin Upload Section */}
      {isAdmin && (
        <DocumentUploadAdmin />
      )}

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
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">{doc.title}</div>
                      <div className="text-sm text-[color:var(--muted)]">
                        {doc.fileName} • {formatBytes(doc.sizeBytes)} • {getDocumentTypeLabel(doc.type)}
                        {doc.viewedAt && (
                          <span className="ml-2 text-green-400">
                            • ✓ Viewed {new Date(doc.viewedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-[color:var(--muted)]">
                      From: {doc.uploadedBy.name}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(doc.id)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
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

