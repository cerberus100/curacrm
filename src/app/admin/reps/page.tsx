import { RepsManagementClient } from "./reps-management-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RepsManagementPage() {
  // Middleware handles auth - this page only renders for admins
  return <RepsManagementClient />;
}
