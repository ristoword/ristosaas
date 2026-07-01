import type { TenantEmailConfig } from "@prisma/client";

export type TenantEmailConfigPayload = {
  host: string;
  port: number;
  username: string;
  password: string;
  fromAddress: string;
  secure: boolean;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapEnabled: boolean;
  imapMailbox: string;
};

export function mapTenantEmailConfigPublic(row: TenantEmailConfig & { tenant?: { name: string } }) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    tenantName: row.tenant?.name ?? "",
    host: row.host,
    port: row.port,
    username: row.username,
    fromAddress: row.fromAddress,
    secure: row.secure,
    imapHost: row.imapHost,
    imapPort: row.imapPort,
    imapSecure: row.imapSecure,
    imapEnabled: row.imapEnabled,
    imapMailbox: row.imapMailbox,
    imapLastUid: row.imapLastUid,
    imapLastSyncAt: row.imapLastSyncAt?.toISOString() ?? null,
    imapLastSyncStatus: row.imapLastSyncStatus,
    lastTestStatus: row.lastTestStatus,
    lastTestedAt: row.lastTestedAt?.toISOString() ?? null,
  };
}

export function resolveImapSettings(config: Pick<
  TenantEmailConfig,
  "imapHost" | "imapPort" | "imapSecure" | "imapMailbox" | "username" | "password" | "host"
>) {
  const host = config.imapHost.trim() || (config.host.includes("aruba") ? "imaps.aruba.it" : "");
  return {
    host,
    port: config.imapPort || 993,
    secure: config.imapSecure,
    mailbox: config.imapMailbox.trim() || "INBOX",
    username: config.username.trim(),
    password: config.password,
  };
}

export function normalizeEmailConfigPayload(
  payload: Partial<TenantEmailConfigPayload>,
  existing?: Pick<TenantEmailConfig, "password"> | null,
): TenantEmailConfigPayload {
  const incomingPwd = typeof payload.password === "string" ? payload.password.trim() : "";
  const password = incomingPwd.length > 0 ? incomingPwd : existing?.password ?? "";
  if (!password) throw new Error("Password email richiesta");
  const port = Math.floor(Number(payload.port));
  const imapPort = Math.floor(Number(payload.imapPort ?? 993));
  if (!Number.isFinite(port) || port <= 0 || port > 65535) throw new Error("Porta SMTP non valida");
  if (!Number.isFinite(imapPort) || imapPort <= 0 || imapPort > 65535) throw new Error("Porta IMAP non valida");
  return {
    host: (payload.host ?? "").trim(),
    port,
    username: (payload.username ?? "").trim(),
    password,
    fromAddress: (payload.fromAddress ?? "").trim(),
    secure: !!payload.secure,
    imapHost: (payload.imapHost ?? "").trim(),
    imapPort,
    imapSecure: payload.imapSecure !== false,
    imapEnabled: !!payload.imapEnabled,
    imapMailbox: (payload.imapMailbox ?? "INBOX").trim() || "INBOX",
  };
}
