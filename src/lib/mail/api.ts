const MOCK = process.env.NEXT_PUBLIC_MAIL_MOCK === "1";

// --- Mock data (for development only)
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
  // Use mock mode if enabled
  if (MOCK) {
    const filtered = mockItems.filter((m) => m.folder === folder);
    const start = cursor ? Number(cursor) : 0;
    const end = start + 10;
    const page = filtered.slice(start, end);
    const nextCursor = end < filtered.length ? String(end) : null;
    return { items: page, nextCursor };
  }

  // Real API call
  const params = new URLSearchParams({ folder });
  if (cursor) params.set('cursor', cursor);
  
  const response = await fetch(`/api/mail/list?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch mail list');
  }
  return response.json();
}

export async function getMessage(id: string) {
  // Use mock mode if enabled
  if (MOCK) {
    const m = mockItems.find((x) => x.id === id)!;
    return { ...m, downloadUrl: "#" };
  }

  // Real API call
  const response = await fetch(`/api/mail/message/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch message');
  }
  return response.json();
}

export async function sendMail(data: {
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  customerId?: string;
}) {
  // Use mock mode if enabled
  if (MOCK) {
    return { ok: true, threadId: crypto.randomUUID() };
  }

  // Real API call
  const response = await fetch('/api/mail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send email');
  }
  
  return response.json();
}

