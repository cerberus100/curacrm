"use client";
import { useEffect, useState } from "react";
import { getMessage } from "@/lib/mail/api";

export default function MailReader({ 
  messageId 
}: { 
  messageId: string | null;
}) {
  const [msg, setMsg] = useState<any | null>(null);

  useEffect(() => {
    if (!messageId) return setMsg(null);
    (async () => setMsg(await getMessage(messageId)))();
  }, [messageId]);

  if (!messageId) {
    return <div className="text-muted-foreground">Select a message</div>;
  }

  if (!msg) {
    return <div>Loading…</div>;
  }

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="text-lg font-semibold">{msg.subject || "(no subject)"}</div>
      <div className="text-sm text-muted-foreground">
        {msg.fromAddress} → {msg.toAddresses}
      </div>
      {msg.downloadUrl && (
        <a
          className="text-sm underline"
          href={msg.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Download raw
        </a>
      )}
      <div className="text-xs text-muted-foreground">
        Date: {new Date(msg.date).toLocaleString()}
      </div>
      <div className="rounded-md border p-2 whitespace-pre-wrap">
        {msg.snippet || "Open raw to view full body/HTML"}
      </div>
    </div>
  );
}

