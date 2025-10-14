"use client";

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderTree } from "./FolderTree";
import { DocumentCard } from "./DocumentCard";
import { DocumentSearch } from "./DocumentSearch";
import { Breadcrumbs } from "./Breadcrumbs";
import { UploadDialog } from "./UploadDialog";
import { FolderDialog } from "./FolderDialog";
import { Upload, FolderPlus, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function DocumentManagementClient() {
  const { user, isAdmin } = useCurrentUser();
  const { toast } = useToast();
  const router = useRouter();

  const [folders, setFolders] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>();

  useEffect(() => {
    fetchFolders();
    fetchDocuments();
  }, [selectedFolderId, searchQuery, fileTypeFilter]);

  const fetchFolders = async () => {
    try {
      const response = await fetch("/api/folders");
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFolderId) params.set("folderId", selectedFolderId);
      if (searchQuery) params.set("search", searchQuery);
      if (fileTypeFilter) params.set("fileType", fileTypeFilter);

      const response = await fetch(`/api/documents-v2?${params.toString()}`);
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

  const handleSearch = (query: string, fileType?: string) => {
    setSearchQuery(query);
    setFileTypeFilter(fileType);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setFileTypeFilter(undefined);
  };

  const handleDownload = async (doc: any) => {
    try {
      const response = await fetch(`/api/documents-v2/${doc.id}/download`);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Downloaded",
        description: `${doc.title} downloaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (doc: any) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;

    try {
      const response = await fetch(`/api/documents-v2/${doc.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      toast({
        title: "Deleted",
        description: `${doc.title} deleted successfully`,
      });

      fetchDocuments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const handleCreateFolder = () => {
    setShowNewFolder(true);
  };

  const handleFolderCreated = () => {
    setShowNewFolder(false);
    fetchFolders();
    toast({
      title: "Folder Created",
      description: "New folder created successfully",
    });
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    fetchDocuments();
    toast({
      title: "Uploaded",
      description: "Document uploaded successfully",
    });
  };

  const currentFolder = folders.find((f) => f.id === selectedFolderId);
  const breadcrumbPath = currentFolder
    ? [{ id: currentFolder.id, name: currentFolder.name }]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold mt-2">Document Library</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Manage and organize documents for your team"
              : "Browse and download shared documents"}
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <Button onClick={handleCreateFolder}>
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        )}
      </div>

      {/* Breadcrumbs */}
      {breadcrumbPath.length > 0 && (
        <Breadcrumbs path={breadcrumbPath} onNavigate={setSelectedFolderId} />
      )}

      {/* Search */}
      <DocumentSearch onSearch={handleSearch} onClear={handleClearSearch} />

      {/* Main Content */}
      <div className="grid grid-cols-4 gap-6">
        {/* Left Sidebar - Folders */}
        <div className="col-span-1">
          <FolderTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={handleCreateFolder}
            onEditFolder={(folder) => console.log("Edit", folder)}
            onDeleteFolder={(folder) => console.log("Delete", folder)}
          />
        </div>

        {/* Right Content - Documents */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>
                {currentFolder ? currentFolder.name : "All Documents"}
              </CardTitle>
              <CardDescription>
                {loading
                  ? "Loading..."
                  : `${documents.length} document${documents.length !== 1 ? "s" : ""}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading documents...
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No documents found</p>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setShowUpload(true)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Your First Document
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-3">
                  {documents.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      onDownload={handleDownload}
                      onDelete={isAdmin ? handleDelete : undefined}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      {showUpload && (
        <UploadDialog
          folderId={selectedFolderId}
          folders={folders}
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadComplete}
        />
      )}

      {showNewFolder && (
        <FolderDialog
          parentId={selectedFolderId}
          onClose={() => setShowNewFolder(false)}
          onSuccess={handleFolderCreated}
        />
      )}
    </div>
  );
}

