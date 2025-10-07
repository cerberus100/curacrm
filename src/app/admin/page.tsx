import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { NavShell } from "@/components/nav-shell";
import { AdminContent } from "@/components/admin/admin-content";

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
