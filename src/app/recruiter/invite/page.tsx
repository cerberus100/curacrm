import { RecruiterInviteClient } from "./recruiter-invite-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RecruiterInvitePage() {
  // Middleware handles auth - this page only renders for recruiters/admins
  return <RecruiterInviteClient />;
}
