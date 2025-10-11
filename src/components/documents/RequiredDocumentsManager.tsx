"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface RequiredDocType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  required: boolean;
  order: number;
  active: boolean;
}

export function RequiredDocumentsManager() {
  const { toast } = useToast();
  const [types, setTypes] = useState<RequiredDocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const response = await fetch("/api/admin/required-documents", {
        credentials: "include",
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        setTypes(data.types || []);
      }
    } catch (error) {
      console.error("Failed to fetch required document types:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.code) {
      toast({
        title: "Missing fields",
        description: "Name and code are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/required-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          order: types.length + 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save");
      }

      toast({
        title: "✅ Document type added",
        description: `${formData.name} has been added`,
      });

      // Reset form
      setFormData({ name: "", code: "", description: "" });
      setShowForm(false);

      // Refresh list
      fetchTypes();
    } catch (error) {
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from required documents?`)) return;

    try {
      const response = await fetch(`/api/admin/required-documents?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      toast({
        title: "✅ Document type removed",
        description: `${name} is no longer required`,
      });

      fetchTypes();
    } catch (error) {
      toast({
        title: "Failed to delete",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Required Onboarding Documents</CardTitle>
            <CardDescription>
              Manage document types that all reps must upload
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            size="sm"
            variant={showForm ? "outline" : "default"}
          >
            <Plus className="h-4 w-4 mr-2" />
            {showForm ? "Cancel" : "Add Document Type"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border border-border rounded-lg bg-card/50">
            <h3 className="font-semibold mb-4">Add New Document Type</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Document Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., W-9 Tax Form"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g., w9 (lowercase, no spaces)"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  required
                />
              </div>
            </div>
            <div className="mt-3">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Brief description of this document"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Add Document Type"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : types.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No required documents configured yet. Click &ldquo;Add Document Type&rdquo; to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {types.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{type.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {type.code}
                    </Badge>
                  </div>
                  {type.description && (
                    <p className="text-sm text-muted-foreground">
                      {type.description}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(type.id, type.name)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

