"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { SendDocumentModal } from "./send-document-modal";
import { Badge } from "@/components/ui/badge";

interface LibraryDocument {
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
  recipients: Array<{
    id: string;
    rep: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export function DocumentLibraryClient() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sendingDoc, setSendingDoc] = useState<LibraryDocument | null>(null);

  // Upload form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState("policy");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/admin/documents", {
        credentials: "include",
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !title) {
      toast({
        title: "Missing fields",
        description: "Please provide a title and file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("type", type);
      if (description) formData.append("description", description);

      const response = await fetch("/api/admin/documents/upload", {
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
        description: `${title} has been uploaded successfully`,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setFile(null);
      setType("policy");
      (document.getElementById("file-input") as HTMLInputElement).value = "";

      // Refresh list
      fetchDocuments();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await fetch(`/api/admin/documents?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      toast({
        title: "✅ Document deleted",
      });

      fetchDocuments();
    } catch (error) {
      toast({
        title: "Failed to delete",
        variant: "destructive",
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>
            Upload documents to share with reps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Document Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., W-9 Form 2024"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Document Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="w9">W-9 Tax Form</SelectItem>
                    <SelectItem value="baa">BAA Agreement</SelectItem>
                    <SelectItem value="policy">Company Policy</SelectItem>
                    <SelectItem value="training">Training Material</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Additional details about this document..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-input">File *</Label>
              <Input
                id="file-input"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <Button type="submit" disabled={uploading || !file || !title}>
              {uploading ? "Uploading..." : "Upload Document"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Document List */}
      <Card>
        <CardHeader>
          <CardTitle>Document Library</CardTitle>
          <CardDescription>
            {documents.length} document(s) in library
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="text-muted-foreground">
              No documents uploaded yet. Upload your first document above.
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-accent/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{doc.title}</h3>
                      <Badge variant="secondary">{doc.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {doc.description || "No description"}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>📄 {doc.fileName}</span>
                      <span>📦 {formatBytes(doc.sizeBytes)}</span>
                      <span>📅 {formatDate(doc.createdAt)}</span>
                      <span>👤 {doc.uploadedBy.name}</span>
                      <span>
                        📤 Sent to {doc.recipients.length} rep(s)
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSendingDoc(doc)}
                    >
                      Send to Reps
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/api/documents/download?id=${doc.id}`)}
                    >
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(doc.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Modal */}
      {sendingDoc && (
        <SendDocumentModal
          document={sendingDoc}
          onClose={() => setSendingDoc(null)}
          onSuccess={() => {
            setSendingDoc(null);
            fetchDocuments();
          }}
        />
      )}
    </div>
  );
}
