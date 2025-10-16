import { requireAdmin } from "@/lib/auth";
import { VendorDetailClient } from "./vendor-detail-client";

export default async function VendorDetailPage() {
  await requireAdmin();
  
  return <VendorDetailClient />;
}