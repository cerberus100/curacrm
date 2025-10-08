import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { NavShell } from "@/components/nav-shell";
import { AdminContent } from "@/components/admin/admin-content";

// Force dynamic rendering for routes using cookies()
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  try {
    // Require admin access - throws error if not admin
    await requireAdmin();
  } catch (error) {
    // Redirect to unauthorized page
    redirect("/unauthorized");
  }

  return (
    <NavShell>
      <AdminContent />
    </NavShell>
  );
}
