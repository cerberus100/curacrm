"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, FolderOpen, ChevronRight, ChevronDown, MoreVertical } from "lucide-react";

interface FolderData {
  id: string;
  name: string;
  description?: string;
  _count: {
    documents: number;
    children?: number;
  };
  createdBy: {
    name: string;
  };
}

interface FolderTreeProps {
  folders: FolderData[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: () => void;
  onEditFolder: (folder: FolderData) => void;
  onDeleteFolder: (folder: FolderData) => void;
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFolder = (folder: FolderData, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = (folder._count.children || 0) > 0;

    return (
      <div key={folder.id} style={{ marginLeft: `${level * 16}px` }}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-accent group ${
            isSelected ? "bg-accent" : ""
          }`}
          onClick={() => onSelectFolder(folder.id)}
        >
          {hasChildren && (
            <button
              className="p-0.5 hover:bg-accent-foreground/10 rounded"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-blue-400" />
          ) : (
            <Folder className="h-4 w-4 text-blue-400" />
          )}
          
          <span className="flex-1 text-sm">{folder.name}</span>
          
          <span className="text-xs text-muted-foreground">
            {folder._count.documents}
          </span>

          <button
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent-foreground/10 rounded"
            onClick={(e) => {
              e.stopPropagation();
              // Show dropdown menu
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        {/* Render children if expanded */}
        {isExpanded && hasChildren && (
          <div className="mt-1">
            {/* Child folders would be rendered here */}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Folders</h3>
          <Button size="sm" onClick={onCreateFolder}>
            + New Folder
          </Button>
        </div>

        {/* Root / All Documents */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-accent mb-2 ${
            selectedFolderId === null ? "bg-accent" : ""
          }`}
          onClick={() => onSelectFolder(null)}
        >
          <Folder className="h-4 w-4" />
          <span className="text-sm font-medium">All Documents</span>
        </div>

        {/* Folder list */}
        <div className="space-y-1">
          {folders.map((folder) => renderFolder(folder))}
        </div>

        {folders.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-4">
            No folders yet. Create one to organize your documents.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

