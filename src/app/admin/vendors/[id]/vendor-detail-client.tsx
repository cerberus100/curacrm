"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductForm } from "./product-form";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  category?: string;
}

interface Vendor {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  phone?: string;
  products: Product[];
}

export function VendorDetailClient() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchVendor();
  }, [vendorId]);

  const fetchVendor = async () => {
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}`);
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/unauthorized");
          return;
        }
        if (response.status === 404) {
          router.push("/admin/vendors");
          return;
        }
        throw new Error("Failed to fetch vendor");
      }
      const data = await response.json();
      setVendor(data.vendor);
    } catch (error) {
      console.error("Error fetching vendor:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      await fetchVendor();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product");
    }
  };

  const handleFormSuccess = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    fetchVendor();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return null;
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/vendors")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Vendors
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">{vendor.name}</h1>
        <p className="text-muted-foreground">Vendor Details & Products</p>
      </div>

      <div className="space-y-6">
        <Card className="bg-card border-border rounded-2xl">
          <CardHeader>
            <CardTitle>Vendor Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Contact Name</dt>
                <dd className="text-sm">{vendor.contactName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Contact Email</dt>
                <dd className="text-sm">{vendor.contactEmail}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                <dd className="text-sm">{vendor.phone || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Total Products</dt>
                <dd className="text-sm">{vendor.products.length}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Products</CardTitle>
              <CardDescription>
                {vendor.products.length} product{vendor.products.length !== 1 ? "s" : ""} listed
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingProduct(null);
                setShowProductForm(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </CardHeader>
          <CardContent>
            {vendor.products.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No products yet. Add your first product to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Product Name</th>
                      <th className="pb-3 font-medium">SKU</th>
                      <th className="pb-3 font-medium">Category</th>
                      <th className="pb-3 font-medium text-right">Unit Price</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {vendor.products.map((product) => (
                      <tr key={product.id} className="group hover:bg-muted/50">
                        <td className="py-4 font-medium">{product.name}</td>
                        <td className="py-4">
                          <Badge variant="outline">{product.sku}</Badge>
                        </td>
                        <td className="py-4 text-sm">{product.category || "-"}</td>
                        <td className="py-4 text-right font-medium">
                          {formatCurrency(product.unitPrice)}
                        </td>
                        <td className="py-4">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingProduct(product);
                                setShowProductForm(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProduct(product.id)}
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
      </div>

      {showProductForm && (
        <ProductForm
          vendorId={vendorId}
          product={editingProduct}
          onClose={() => {
            setShowProductForm(false);
            setEditingProduct(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
