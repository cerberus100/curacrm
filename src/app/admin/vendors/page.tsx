import { VendorsClient } from "./vendors-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function VendorsPage() {
  // Middleware handles auth - this page only renders for admins
  return <VendorsClient />;
}