"use client";

export default function OpenMailboxButton({ 
  corpEmail 
}: { 
  corpEmail?: string | null 
}) {
  const title = corpEmail ? `Open ${corpEmail}` : "Open Mailbox";
  
  return (
    <a
      href="/api/mail/open"
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="rounded-md border border-border px-3 py-1 text-sm hover:bg-accent"
    >
      Open Mailbox
    </a>
  );
}

