import nodemailer from "nodemailer";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/logger";

export type TenantMailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type TenantMailPayload = {
  tenantId: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: TenantMailAttachment[];
};

export type TenantMailResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: "smtp_not_configured" | "invalid_recipient" | "send_failed"; error?: string };

function normaliseRecipients(input: string | string[] | undefined): string[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : [input];
  return arr
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v));
}

/**
 * Invia un'email usando la TenantEmailConfig del tenant (SMTP per tenant).
 * Non lancia mai: ritorna un risultato strutturato, così gli endpoint
 * possono decidere cosa rispondere all'UI.
 */
export async function sendTenantMail(payload: TenantMailPayload): Promise<TenantMailResult> {
  const to = normaliseRecipients(payload.to);
  if (to.length === 0) return { ok: false, reason: "invalid_recipient" };
  const cc = normaliseRecipients(payload.cc);
  const bcc = normaliseRecipients(payload.bcc);

  const config = await prisma.tenantEmailConfig.findUnique({
    where: { tenantId: payload.tenantId },
  });
  if (!config || !config.host?.trim() || !config.fromAddress?.trim()) {
    return { ok: false, reason: "smtp_not_configured" };
  }

  const transporter = nodemailer.createTransport({
    host: config.host.trim(),
    port: config.port,
    secure: config.secure,
    auth: config.username
      ? { user: config.username, pass: config.password }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  try {
    const info = await transporter.sendMail({
      from: config.fromAddress,
      to,
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      replyTo: payload.replyTo,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      attachments: payload.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    });

    await prisma.tenantEmailConfig
      .update({
        where: { tenantId: payload.tenantId },
        data: { lastTestStatus: "ok", lastTestedAt: new Date() },
      })
      .catch(() => {});

    return { ok: true, messageId: info.messageId };
  } catch (error) {
    logger.warn("tenant_mail_send_failed", {
      tenantId: payload.tenantId,
      error: error instanceof Error ? error.message : String(error),
    });
    await prisma.tenantEmailConfig
      .update({
        where: { tenantId: payload.tenantId },
        data: { lastTestStatus: "fail", lastTestedAt: new Date() },
      })
      .catch(() => {});
    return {
      ok: false,
      reason: "send_failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
