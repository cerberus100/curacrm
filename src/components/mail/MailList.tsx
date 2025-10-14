"use client";
import { useEffect, useState } from "react";
import { listMail } from "@/lib/mail/api";

export default function MailList({ 
  folder, 
  onSelect 
}: { 
  folder: "inbox" | "sent"; 
  onSelect: (id: string) => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(next?: string | null) {
    setLoading(true);
    const { items: page, nextCursor } = await listMail(folder, next || undefined);
    setItems(next ? [...items, ...page] : page);
    setCursor(nextCursor);
    setLoading(false);
  }

  useEffect(() => {
    load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder]);

  return (
    <div className="grow overflow-y-auto border rounded-md">
      {loading && <div className="p-3 text-sm text-muted-foreground">Loading…</div>}
      {items.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          className="w-full text-left px-3 py-2 border-b hover:bg-accent"
        >
          <div className="flex justify-between">
            <div className="font-medium truncate">{m.subject || "(no subject)"}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(m.date).toLocaleString()}
            </div>
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {m.fromAddress} → {m.toAddresses}
          </div>
          <div className="text-sm truncate">{m.snippet}</div>
        </button>
      ))}
      {!loading && items.length === 0 && (
        <div className="p-3 text-sm text-muted-foreground">No messages</div>
      )}
      {cursor && (
        <div className="p-2">
          <button
            className="rounded-md border px-3 py-1"
            onClick={() => load(cursor)}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

