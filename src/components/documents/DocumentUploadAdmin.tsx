"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Rep {
  id: string;
  name: string;
  email: string;
}

export function DocumentUploadAdmin() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState("OTHER");
  const [description, setDescription] = useState("");
  const [reps, setReps] = useState<Rep[]>([]);
  const [selectedReps, setSelectedReps] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

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

  const toggleRep = (repId: string) => {
    const newSelected = new Set(selectedReps);
    if (newSelected.has(repId)) {
      newSelected.delete(repId);
    } else {
      newSelected.add(repId);
    }
    setSelectedReps(newSelected);
    setSelectAll(newSelected.size === reps.length);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedReps(new Set());
      setSelectAll(false);
    } else {
      setSelectedReps(new Set(reps.map(r => r.id)));
      setSelectAll(true);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    if (selectedReps.size === 0) {
      toast({
        title: "No recipients",
        description: "Please select at least one rep to send to",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('description', description);
      formData.append('userIds', Array.from(selectedReps).join(','));

      const response = await fetch("/api/documents/upload", {
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
        description: `Sent to ${data.documentsCreated} rep(s)`,
      });

      // Reset form
      setFile(null);
      setDescription("");
      setSelectedReps(new Set());
      setSelectAll(false);
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

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

  return (
    <Card className="bg-card border-border rounded-2xl">
      <CardHeader>
        <CardTitle>Upload & Distribute Documents</CardTitle>
        <CardDescription>
          Upload documents and send to reps (BAA, W-9, contracts, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <Label htmlFor="file">Document File</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="type">Document Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BAA">Business Associate Agreement</SelectItem>
                <SelectItem value="W9">W-9 Tax Form</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Updated BAA for 2025"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Send To</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {selectAll ? "Deselect All" : "Select All"}
              </Button>
            </div>
            
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
              {reps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reps available</p>
              ) : (
                reps.map((rep) => (
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
            
            {selectedReps.size > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {selectedReps.size} rep(s) selected
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={uploading || !file || selectedReps.size === 0}
            className="w-full"
          >
            {uploading ? (
              <>Uploading...</>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Upload & Send to {selectedReps.size} Rep(s)
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
