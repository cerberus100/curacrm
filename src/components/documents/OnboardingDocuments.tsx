"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Upload, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface OnboardingDocument {
  type: string;
  name: string;
  description: string | null;
  required: boolean;
  order: number;
  status: string;
  fileName: string | null;
  fileKey: string | null;
  signedAt: string | null;
  createdAt: string | null;
  documentId: string | null;
}

export function OnboardingDocuments() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<OnboardingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents/user-documents", {
        credentials: "include",
        cache: "no-store",
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch onboarding documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (type: string, file: File) => {
    setUploading(type);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await fetch("/api/documents/user-documents/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      toast({
        title: "✅ Document uploaded",
        description: `Your ${documents.find(d => d.type === type)?.name} has been uploaded`,
      });

      // Refresh documents
      fetchDocuments();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SIGNED":
        return <Badge className="bg-green-500/10 text-green-400">✓ Signed</Badge>;
      case "SENT":
        return <Badge className="bg-blue-500/10 text-blue-400">✓ Submitted</Badge>;
      case "PENDING":
        return <Badge variant="secondary">⏳ Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Onboarding Documents</CardTitle>
          <CardDescription>Upload required documents for your profile</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Onboarding Documents</CardTitle>
        <CardDescription>
          Upload and manage your required onboarding documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No document requirements at this time
          </p>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.type}
                className="flex items-start justify-between p-4 border border-border rounded-lg"
              >
                <div className="flex items-start gap-3 flex-1">
                  {doc.status === "SIGNED" || doc.status === "SENT" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400 mt-1" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-400 mt-1" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{doc.name}</h3>
                      {doc.required && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {doc.description}
                      </p>
                    )}
                    {doc.fileName && (
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {doc.fileName}
                        {doc.createdAt && (
                          <span>
                            • Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(doc.status)}
                  
                  <div>
                    <Input
                      id={`file-${doc.type}`}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUpload(doc.type, file);
                        }
                      }}
                      disabled={uploading === doc.type}
                    />
                    <Label htmlFor={`file-${doc.type}`}>
                      <Button
                        size="sm"
                        variant={doc.status === "PENDING" ? "default" : "outline"}
                        disabled={uploading === doc.type}
                        asChild
                      >
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading === doc.type
                            ? "Uploading..."
                            : doc.status === "PENDING"
                            ? "Upload"
                            : "Re-upload"}
                        </span>
                      </Button>
                    </Label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

