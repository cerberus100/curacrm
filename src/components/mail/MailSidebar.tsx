"use client";
import Link from "next/link";

export default function MailSidebar({ 
  active 
}: { 
  active: "inbox" | "sent" 
}) {
  return (
    <div className="w-48 shrink-0 space-y-2">
      <Link 
        href="/mail?folder=inbox" 
        className={`block rounded-md px-3 py-2 border ${
          active === "inbox" ? "bg-accent" : ""
        }`}
      >
        Inbox
      </Link>
      <Link 
        href="/mail?folder=sent" 
        className={`block rounded-md px-3 py-2 border ${
          active === "sent" ? "bg-accent" : ""
        }`}
      >
        Sent
      </Link>
    </div>
  );
}

