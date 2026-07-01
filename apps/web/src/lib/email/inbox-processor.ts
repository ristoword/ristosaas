import type { InboundEmailMessage, TenantEmailConfig } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { operationsRepository } from "@/lib/db/repositories/operations.repository";
import { ordersRepository } from "@/lib/db/repositories/orders.repository";
import { fetchNewImapMessages } from "@/lib/email/imap-client";
import { parseInboundEmail } from "@/lib/email/inbox-parser";
import { sendTenantMail } from "@/lib/email/send-tenant-mail";
import { logger } from "@/lib/observability/logger";

export type InboxPollResult = {
  tenantId: string;
  fetched: number;
  created: number;
  processed: number;
  failed: number;
  maxUid: number;
};

async function createBookingFromDraft(tenantId: string, draft: ReturnType<typeof parseInboundEmail> & { type: "booking" }) {
  return operationsRepository.bookings.create(tenantId, {
    customerName: draft.draft.customerName,
    phone: draft.draft.phone,
    email: draft.draft.email,
    date: draft.draft.date,
    time: draft.draft.time,
    guests: draft.draft.guests,
    table: draft.draft.table,
    notes: draft.draft.notes,
    status: draft.draft.status,
    allergies: draft.draft.allergies,
  });
}

async function createOrderFromDraft(tenantId: string, draft: ReturnType<typeof parseInboundEmail> & { type: "order" }) {
  return ordersRepository.create(tenantId, {
    table: draft.draft.table,
    covers: draft.draft.covers,
    area: "sala",
    waiter: "Email",
    notes: draft.draft.notes,
    activeCourse: 1,
    courseStates: { "1": "in_attesa" },
    status: "in_attesa",
    onlinePaymentStatus: "unpaid",
    stripeCheckoutSessionId: null,
    items: draft.draft.items.map((item) => ({
      id: "",
      name: item.name,
      qty: item.qty,
      category: "Email",
      area: "sala" as const,
      price: 0,
      note: item.note ?? null,
      course: 1,
      menuItemId: undefined,
    })),
  });
}

export async function processInboundMessageRecord(
  tenantId: string,
  message: InboundEmailMessage,
  options?: { force?: boolean },
): Promise<InboundEmailMessage> {
  if (message.status === "processed" && !options?.force) return message;

  const parsed = parseInboundEmail({
    fromEmail: message.fromEmail,
    fromName: message.fromName,
    subject: message.subject,
    bodyText: message.bodyText,
    receivedAt: message.receivedAt,
  });

  if (parsed.type === "unknown") {
    return prisma.inboundEmailMessage.update({
      where: { id: message.id },
      data: {
        status: "ignored",
        parsedType: "unknown",
        parsedPayload: { reason: parsed.reason },
        processedAt: new Date(),
        errorMessage: parsed.reason,
      },
    });
  }

  try {
    if (parsed.type === "booking") {
      const booking = await createBookingFromDraft(tenantId, parsed);
      if (booking.email) {
        void sendTenantMail({
          tenantId,
          to: booking.email,
          subject: `Prenotazione ricevuta — ${booking.date} ore ${booking.time}`,
          text: `Ciao ${booking.customerName},\n\nabbiamo ricevuto la tua prenotazione per ${booking.guests} persone il ${booking.date} alle ${booking.time}.\n\nA presto!`,
          templateSlug: "prenotazione_confermata",
        });
      }
      return prisma.inboundEmailMessage.update({
        where: { id: message.id },
        data: {
          status: "processed",
          parsedType: "booking",
          parsedPayload: parsed.draft,
          linkedBookingId: booking.id,
          processedAt: new Date(),
          errorMessage: "",
        },
      });
    }

    const order = await createOrderFromDraft(tenantId, parsed);
    return prisma.inboundEmailMessage.update({
      where: { id: message.id },
      data: {
        status: "processed",
        parsedType: "order",
        parsedPayload: parsed.draft,
        linkedOrderId: order.id,
        processedAt: new Date(),
        errorMessage: "",
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return prisma.inboundEmailMessage.update({
      where: { id: message.id },
      data: {
        status: "failed",
        parsedType: parsed.type,
        parsedPayload: parsed.type === "booking" ? parsed.draft : parsed.draft,
        processedAt: new Date(),
        errorMessage: errMsg,
      },
    });
  }
}

export async function pollTenantInbox(tenantId: string): Promise<InboxPollResult> {
  const config = await prisma.tenantEmailConfig.findUnique({ where: { tenantId } });
  if (!config?.imapEnabled) {
    return { tenantId, fetched: 0, created: 0, processed: 0, failed: 0, maxUid: config?.imapLastUid ?? 0 };
  }

  const sinceUid = config.imapLastUid ?? 0;
  let fetched = 0;
  let created = 0;
  let processed = 0;
  let failed = 0;
  let maxUid = sinceUid;

  try {
    const batch = await fetchNewImapMessages(config, sinceUid, 40);
    maxUid = batch.maxUid;
    for (const msg of batch.messages) {
      fetched += 1;
      const exists = await prisma.inboundEmailMessage.findUnique({
        where: { tenantId_imapUid: { tenantId, imapUid: msg.uid } },
      });
      if (exists) continue;

      const parsed = parseInboundEmail({
        fromEmail: msg.fromEmail,
        fromName: msg.fromName,
        subject: msg.subject,
        bodyText: msg.bodyText,
        receivedAt: msg.receivedAt,
      });

      const row = await prisma.inboundEmailMessage.create({
        data: {
          tenantId,
          imapUid: msg.uid,
          messageId: msg.messageId,
          fromEmail: msg.fromEmail,
          fromName: msg.fromName,
          subject: msg.subject,
          bodyText: msg.bodyText.slice(0, 12000),
          receivedAt: msg.receivedAt,
          status: "pending",
          parsedType: parsed.type === "unknown" ? "unknown" : parsed.type,
          parsedPayload:
            parsed.type === "unknown"
              ? { reason: parsed.reason }
              : parsed.type === "booking"
                ? parsed.draft
                : parsed.draft,
        },
      });
      created += 1;

      const autoProcess =
        parsed.type !== "unknown" &&
        (parsed.confidence === "high" || parsed.confidence === "medium");

      if (autoProcess) {
        const updated = await processInboundMessageRecord(tenantId, row);
        if (updated.status === "processed") processed += 1;
        if (updated.status === "failed") failed += 1;
      }
    }

    await prisma.tenantEmailConfig.update({
      where: { tenantId },
      data: {
        imapLastUid: maxUid,
        imapLastSyncAt: new Date(),
        imapLastSyncStatus: `ok fetched=${fetched} created=${created} processed=${processed}`,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.warn("imap_poll_failed", { tenantId, error: errMsg });
    await prisma.tenantEmailConfig.update({
      where: { tenantId },
      data: {
        imapLastSyncAt: new Date(),
        imapLastSyncStatus: `fail: ${errMsg}`,
      },
    });
    throw error;
  }

  return { tenantId, fetched, created, processed, failed, maxUid };
}

export async function pollAllTenantInboxes(): Promise<InboxPollResult[]> {
  const configs = await prisma.tenantEmailConfig.findMany({
    where: { imapEnabled: true },
    select: { tenantId: true },
  });
  const results: InboxPollResult[] = [];
  for (const cfg of configs) {
    try {
      results.push(await pollTenantInbox(cfg.tenantId));
    } catch {
      results.push({
        tenantId: cfg.tenantId,
        fetched: 0,
        created: 0,
        processed: 0,
        failed: 1,
        maxUid: 0,
      });
    }
  }
  return results;
}
