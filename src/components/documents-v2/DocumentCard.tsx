"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Trash2,
  Edit,
  File,
  FileSpreadsheet,
  FileImage,
  MoreVertical,
} from "lucide-react";

interface DocumentData {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  tags: string[];
  visibility: string;
  uploadedBy: {
    name: string;
  };
  folder?: {
    name: string;
  };
  createdAt: string;
}

interface DocumentCardProps {
  document: DocumentData;
  onDownload: (doc: DocumentData) => void;
  onEdit?: (doc: DocumentData) => void;
  onDelete?: (doc: DocumentData) => void;
  isAdmin: boolean;
}

export function DocumentCard({
  document,
  onDownload,
  onEdit,
  onDelete,
  isAdmin,
}: DocumentCardProps) {
  const getFileIcon = () => {
    if (document.mimeType.includes("pdf")) {
      return <FileText className="h-8 w-8 text-red-400" />;
    }
    if (document.mimeType.includes("sheet") || document.mimeType.includes("excel")) {
      return <FileSpreadsheet className="h-8 w-8 text-green-400" />;
    }
    if (document.mimeType.includes("image")) {
      return <FileImage className="h-8 w-8 text-blue-400" />;
    }
    return <File className="h-8 w-8 text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* File Icon */}
          <div className="shrink-0">{getFileIcon()}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="font-medium text-sm truncate">{document.title}</h4>
                {document.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {document.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDownload(document)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>

                {isAdmin && (
                  <>
                    {onEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(document)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(document)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground flex-wrap">
              <span>{document.fileName}</span>
              <span>•</span>
              <span>{formatFileSize(document.sizeBytes)}</span>
              {document.folder && (
                <>
                  <span>•</span>
                  <span>📁 {document.folder.name}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>Uploaded by {document.uploadedBy.name}</span>
              <span>•</span>
              <span>{formatDate(document.createdAt)}</span>
            </div>

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {document.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Visibility Badge */}
            <div className="mt-2">
              <Badge
                variant={document.visibility === "PUBLIC" ? "default" : "outline"}
                className="text-xs"
              >
                {document.visibility.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

