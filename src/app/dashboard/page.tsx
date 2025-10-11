import { NavShell } from "@/components/nav-shell";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function DashboardPage() {
  return (
    <NavShell>
      <ErrorBoundary>
        <DashboardContent />
      </ErrorBoundary>
    </NavShell>
  );
}
