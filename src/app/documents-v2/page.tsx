import { NavShell } from "@/components/nav-shell";
import { DocumentManagementClient } from "@/components/documents-v2/DocumentManagementClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DocumentsV2Page() {
  return (
    <NavShell>
      <div className="p-6">
        <DocumentManagementClient />
      </div>
    </NavShell>
  );
}

