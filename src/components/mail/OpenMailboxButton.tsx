"use client";

export default function OpenMailboxButton({ 
  corpEmail 
}: { 
  corpEmail?: string | null 
}) {
  const url = process.env.NEXT_PUBLIC_WORKMAIL_WEB_URL!;
  const title = corpEmail ? `Open ${corpEmail}` : "Open Mailbox";
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="rounded-md border border-border px-3 py-1 text-sm hover:bg-accent"
    >
      Open Mailbox
    </a>
  );
}

