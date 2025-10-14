"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import MailSidebar from "@/components/mail/MailSidebar";
import MailList from "@/components/mail/MailList";
import MailReader from "@/components/mail/MailReader";
import ComposeMini from "@/components/mail/ComposeMini";
import OpenMailboxButton from "@/components/mail/OpenMailboxButton";
import { NavShell } from "@/components/nav-shell";
import { useCurrentUser } from "@/hooks/use-current-user";

function MailContent() {
  const searchParams = useSearchParams();
  const folder = (searchParams.get("folder") === "sent" ? "sent" : "inbox") as "inbox" | "sent";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { user } = useCurrentUser();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mail</h1>
        <OpenMailboxButton corpEmail={user?.email} />
      </div>
      
      <div className="flex gap-4">
        <MailSidebar active={folder} />
        <div className="grid grid-cols-2 gap-4 grow">
          <MailList folder={folder} onSelect={setSelectedId} />
          <div className="space-y-4">
            <MailReader messageId={selectedId} />
            <ComposeMini />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MailPage() {
  return (
    <NavShell>
      <div className="p-4">
        <Suspense fallback={<div>Loading mail...</div>}>
          <MailContent />
        </Suspense>
      </div>
    </NavShell>
  );
}

