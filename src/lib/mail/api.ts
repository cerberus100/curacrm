const MOCK = process.env.NEXT_PUBLIC_MAIL_MOCK === "1";

// --- Mock data (delete when backend ready)
const mockItems = Array.from({ length: 25 }).map((_, i) => ({
  id: `m${i}`,
  userId: "me",
  folder: i % 3 ? "inbox" : "sent",
  subject: i % 4 ? `Follow-up #${i}` : "(no subject)",
  fromAddress: i % 3 ? "client@example.com" : "me@curagenesis.com",
  toAddresses: i % 3 ? "me@curagenesis.com" : "client@example.com",
  date: new Date(Date.now() - i * 3600_000).toISOString(),
  snippet: "Lorem ipsum dolor sit amet...",
  s3Key: `mail/mock/${i}.eml`,
  messageId: `mid-${i}`,
  hasAttachments: false,
  sizeBytes: 4096,
}));

export async function listMail(folder: "inbox" | "sent", cursor?: string) {
  // Always use mock mode for now (backend not ready)
  const filtered = mockItems.filter((m) => m.folder === folder);
  const start = cursor ? Number(cursor) : 0;
  const end = start + 10;
  const page = filtered.slice(start, end);
  const nextCursor = end < filtered.length ? String(end) : null;
  return { items: page, nextCursor };
}

export async function getMessage(id: string) {
  // Always use mock mode for now (backend not ready)
  const m = mockItems.find((x) => x.id === id)!;
  return { ...m, downloadUrl: "#" };
}

export async function sendMail(data: {
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  customerId?: string;
}) {
  // Always use mock mode for now (backend not ready)
  return { ok: true, threadId: crypto.randomUUID() };
}

