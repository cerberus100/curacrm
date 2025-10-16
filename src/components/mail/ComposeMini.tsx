"use client";
import { useState } from "react";
import { sendMail } from "@/lib/mail/api";

export default function ComposeMini({
  defaultTo,
  customerId,
}: {
  defaultTo?: string;
  customerId?: string;
}) {
  const [to, setTo] = useState(defaultTo || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setNote(null);
    try {
      await sendMail({
        to: to.split(",").map((s) => s.trim()).filter(Boolean),
        subject,
        text: body,
        html: `<div>${body.replace(/\n/g, "<br/>")}</div>`,
        customerId,
      });
      setNote("Sent");
      setSubject("");
      setBody("");
    } catch (e: any) {
      setNote(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border p-2 space-y-2">
      <div className="text-sm font-medium">Compose</div>
      <input
        className="w-full rounded-md border px-2 py-1 text-sm text-foreground bg-background"
        placeholder="To"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      <input
        className="w-full rounded-md border px-2 py-1 text-sm text-foreground bg-background"
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <textarea
        className="w-full rounded-md border px-2 py-1 text-sm h-28 text-foreground bg-background"
        placeholder="Message…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{note}</span>
        <button
          disabled={busy}
          onClick={send}
          className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}

