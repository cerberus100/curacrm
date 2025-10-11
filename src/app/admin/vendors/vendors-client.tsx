"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { VendorForm } from "./vendor-form";
import { formatCurrency } from "@/lib/utils";

interface Vendor {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  phone?: string;
  _count: {
    products: number;
  };
}

export function VendorsClient() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    // Check auth client-side
    const currentUser = localStorage.getItem('current_user');
    if (currentUser) {
      const user = JSON.parse(currentUser);
      if (user.role !== 'ADMIN') {
        router.push('/unauthorized');
        return;
      }
    }
    
    fetchVendors();
  }, [router]);

  const fetchVendors = async () => {
    try {
      const response = await fetch("/api/admin/vendors");
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/unauthorized");
          return;
        }
        throw new Error("Failed to fetch vendors");
      }
      const data = await response.json();
      setVendors(data.vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vendor? This will also delete all associated products.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/vendors/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete vendor");
      }

      await fetchVendors();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      alert("Failed to delete vendor");
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingVendor(null);
    fetchVendors();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold mb-2">Vendors</h1>
        <p className="text-muted-foreground">Manage vendor information and products</p>
      </div>

      <Card className="bg-card border-border rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Vendors</CardTitle>
            <CardDescription>
              {vendors.length} vendor{vendors.length !== 1 ? "s" : ""} registered
            </CardDescription>
          </div>
          <Button
            onClick={() => {
              setEditingVendor(null);
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Vendor
          </Button>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No vendors yet. Add your first vendor to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Contact</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Phone</th>
                    <th className="pb-3 font-medium text-center">Products</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vendors.map((vendor) => (
                    <tr key={vendor.id} className="group hover:bg-muted/50">
                      <td className="py-4">
                        <button
                          onClick={() => router.push(`/admin/vendors/${vendor.id}`)}
                          className="font-medium hover:underline text-left"
                        >
                          {vendor.name}
                        </button>
                      </td>
                      <td className="py-4">{vendor.contactName}</td>
                      <td className="py-4 text-sm">{vendor.contactEmail}</td>
                      <td className="py-4 text-sm">{vendor.phone || "-"}</td>
                      <td className="py-4 text-center">
                        <Badge variant="secondary" className="gap-1">
                          <Package className="h-3 w-3" />
                          {vendor._count.products}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingVendor(vendor);
                              setShowForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(vendor.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <VendorForm
          vendor={editingVendor}
          onClose={() => {
            setShowForm(false);
            setEditingVendor(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
