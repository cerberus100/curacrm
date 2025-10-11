import { NavShell } from "@/components/nav-shell";
import { IntakeContent } from "@/components/intake/intake-content";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function IntakePage() {
  return (
    <NavShell>
      <ErrorBoundary>
        <IntakeContent />
      </ErrorBoundary>
    </NavShell>
  );
}
