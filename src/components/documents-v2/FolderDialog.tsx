"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface FolderDialogProps {
  parentId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function FolderDialog({ parentId, onClose, onSuccess }: FolderDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: "Missing Name",
        description: "Please provide a folder name",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          parentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create folder");
      }

      onSuccess();
    } catch (error) {
      console.error("Create folder error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create folder",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Create a folder to organize your documents
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="folderName">Folder Name *</Label>
            <Input
              id="folderName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tax Forms, Training Materials, etc."
              maxLength={255}
            />
          </div>

          <div>
            <Label htmlFor="folderDescription">Description (Optional)</Label>
            <Input
              id="folderDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what's in this folder"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? "Creating..." : "Create Folder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

