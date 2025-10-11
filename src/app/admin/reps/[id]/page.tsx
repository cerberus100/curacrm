import { requireAdmin } from "@/lib/auth-helpers";
import { RepDetailClient } from "./rep-detail-client";

export default async function RepDetailPage() {
  await requireAdmin();
  
  return <RepDetailClient />;
}
