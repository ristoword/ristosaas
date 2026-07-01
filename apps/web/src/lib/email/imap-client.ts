import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { TenantEmailConfig } from "@prisma/client";
import { resolveImapSettings } from "@/lib/email/tenant-email-config";

export type FetchedImapMessage = {
  uid: number;
  messageId: string | null;
  fromEmail: string;
  fromName: string;
  subject: string;
  bodyText: string;
  receivedAt: Date;
};

export async function testImapConnection(config: TenantEmailConfig): Promise<{ ok: true } | { ok: false; error: string }> {
  const imap = resolveImapSettings(config);
  if (!imap.host || !imap.username || !imap.password) {
    return { ok: false, error: "Configurazione IMAP incompleta" };
  }
  const client = new ImapFlow({
    host: imap.host,
    port: imap.port,
    secure: imap.secure,
    auth: { user: imap.username, pass: imap.password },
    logger: false,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
  try {
    await client.connect();
    const lock = await client.getMailboxLock(imap.mailbox);
    lock.release();
    await client.logout();
    return { ok: true };
  } catch (error) {
    try {
      await client.logout();
    } catch {
      // ignore
    }
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function fetchNewImapMessages(
  config: TenantEmailConfig,
  sinceUid = 0,
  limit = 30,
): Promise<{ messages: FetchedImapMessage[]; maxUid: number }> {
  const imap = resolveImapSettings(config);
  if (!imap.host || !imap.username || !imap.password) {
    throw new Error("Configurazione IMAP incompleta");
  }
  const client = new ImapFlow({
    host: imap.host,
    port: imap.port,
    secure: imap.secure,
    auth: { user: imap.username, pass: imap.password },
    logger: false,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  const messages: FetchedImapMessage[] = [];
  let maxUid = sinceUid;
  await client.connect();
  const lock = await client.getMailboxLock(imap.mailbox);
  try {
    const range = sinceUid > 0 ? `${sinceUid + 1}:*` : "1:*";
    let count = 0;
    for await (const msg of client.fetch({ uid: range }, { uid: true, source: true })) {
      if (!msg.uid || !msg.source) continue;
      if (msg.uid <= sinceUid) continue;
      maxUid = Math.max(maxUid, msg.uid);
      const parsed = await simpleParser(msg.source);
      const from = parsed.from?.value?.[0];
      const fromEmail = (from?.address ?? "").trim().toLowerCase();
      if (!fromEmail) continue;
      messages.push({
        uid: msg.uid,
        messageId: parsed.messageId ?? null,
        fromEmail,
        fromName: (from?.name ?? "").trim(),
        subject: (parsed.subject ?? "").trim(),
        bodyText: (parsed.text ?? (typeof parsed.html === "string" ? parsed.html.replace(/<[^>]+>/g, " ") : "")).trim(),
        receivedAt: parsed.date ?? new Date(),
      });
      count += 1;
      if (count >= limit) break;
    }
  } finally {
    lock.release();
  }
  await client.logout();
  return { messages, maxUid };
}
