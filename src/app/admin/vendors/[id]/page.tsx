import { requireAdmin } from "@/lib/auth-helpers";
import { VendorDetailClient } from "./vendor-detail-client";

export default async function VendorDetailPage() {
  await requireAdmin();
  
  return <VendorDetailClient />;
}