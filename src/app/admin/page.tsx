import { NavShell } from "@/components/nav-shell";
import { AdminContent } from "@/components/admin/admin-content";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AdminPage() {
  // Middleware handles auth - this page only renders for admins
  return (
    <NavShell>
      <ErrorBoundary>
        <AdminContent />
      </ErrorBoundary>
    </NavShell>
  );
}
