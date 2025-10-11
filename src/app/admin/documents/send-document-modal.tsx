"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface User {
  id: string;
  name: string;
  email: string;
}

interface LibraryDocument {
  id: string;
  title: string;
  fileName: string;
}

export function SendDocumentModal({
  document,
  onClose,
  onSuccess,
}: {
  document: LibraryDocument;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [reps, setReps] = useState<User[]>([]);
  const [selectedReps, setSelectedReps] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchReps();
  }, []);

  const fetchReps = async () => {
    try {
      const response = await fetch("/api/users?role=agent", {
        credentials: "include",
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        setReps(data.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch reps:", error);
    }
  };

  const filteredReps = reps.filter(rep =>
    rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rep.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleRep = (repId: string) => {
    const newSelected = new Set(selectedReps);
    if (newSelected.has(repId)) {
      newSelected.delete(repId);
    } else {
      newSelected.add(repId);
    }
    setSelectedReps(newSelected);
  };

  const selectAll = () => {
    setSelectedReps(new Set(filteredReps.map(r => r.id)));
  };

  const deselectAll = () => {
    setSelectedReps(new Set());
  };

  const handleSend = async () => {
    if (selectedReps.size === 0) {
      toast({
        title: "No recipients selected",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const response = await fetch("/api/admin/documents/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          documentId: document.id,
          repIds: Array.from(selectedReps),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send");
      }

      toast({
        title: "✅ Document sent",
        description: `Sent to ${data.recipientsCreated} rep(s)`,
      });

      onSuccess();
    } catch (error) {
      toast({
        title: "Failed to send",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Document to Reps</DialogTitle>
          <DialogDescription>
            Sending: {document.title} ({document.fileName})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <Input
            placeholder="Search reps by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Select All / Deselect All */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAll}
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={deselectAll}
            >
              Deselect All
            </Button>
            <span className="text-sm text-muted-foreground flex items-center">
              {selectedReps.size} selected
            </span>
          </div>

          {/* Rep List */}
          <div className="max-h-64 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
            {filteredReps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No reps found
              </p>
            ) : (
              filteredReps.map((rep) => (
                <div key={rep.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`rep-${rep.id}`}
                    checked={selectedReps.has(rep.id)}
                    onCheckedChange={() => toggleRep(rep.id)}
                  />
                  <label
                    htmlFor={`rep-${rep.id}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {rep.name} ({rep.email})
                  </label>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || selectedReps.size === 0}
              className="flex-1"
            >
              {sending ? "Sending..." : `Send to ${selectedReps.size} Rep(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
