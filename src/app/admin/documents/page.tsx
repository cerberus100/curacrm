import { DocumentLibraryClient } from "./document-library-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function DocumentLibraryPage() {
  return <DocumentLibraryClient />;
}
