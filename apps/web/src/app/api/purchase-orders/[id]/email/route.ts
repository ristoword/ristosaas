import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { purchaseOrdersRepository } from "@/lib/db/repositories/purchase-orders.repository";
import { renderPurchaseOrderPdf } from "@/lib/pdf/purchase-order-pdf";
import { sendTenantMail } from "@/lib/email/send-tenant-mail";

const ROLES = ["owner", "supervisor", "magazzino", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * POST /api/purchase-orders/:id/email
 * body: { to?: string | string[]; message?: string; attachPdf?: boolean }
 *
 * Invia al fornitore un'email con il riepilogo ordine. Allega il PDF se
 * attachPdf=true (default). Usa la TenantEmailConfig del tenant.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = getTenantId();

  const order = await purchaseOrdersRepository.get(tenantId, id);
  if (!order) return err("Ordine non trovato.", 404);
  if (order.status === "annullato") return err("Ordine annullato, email non inviata.", 400);

  const payload = await body<{ to?: string | string[]; message?: string; attachPdf?: boolean }>(req);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true },
  });
  const supplier = await prisma.supplier.findFirst({
    where: { tenantId, id: order.supplierId },
    select: { email: true, name: true },
  });
  const emailConfig = await prisma.tenantEmailConfig.findUnique({
    where: { tenantId },
    select: { fromAddress: true, host: true },
  });
  if (!emailConfig?.host) {
    return err(
      "SMTP del tenant non configurato. Vai su Impostazioni Email per configurarlo prima di inviare ordini.",
      400,
    );
  }

  const recipients = payload.to
    ? Array.isArray(payload.to)
      ? payload.to
      : [payload.to]
    : supplier?.email
      ? [supplier.email]
      : [];
  if (recipients.length === 0) {
    return err("Nessun destinatario email: aggiungi l'email del fornitore in anagrafica.", 400);
  }

  const attachPdf = payload.attachPdf !== false;
  const attachments = attachPdf
    ? [
        {
          filename: `ordine-${order.code}.pdf`,
          content: await renderPurchaseOrderPdf({
            order,
            tenantName: tenant?.name ?? "RistoSaaS",
            fromAddress: emailConfig?.fromAddress ?? null,
          }),
          contentType: "application/pdf",
        },
      ]
    : [];

  const itemsText = order.items
    .map(
      (item) =>
        `- ${item.warehouseItemName}: ${item.qtyOrdered} ${item.unit} x € ${item.unitCost.toFixed(2)} = € ${item.lineTotal.toFixed(2)}`,
    )
    .join("\n");
  const customMessage = (payload.message ?? "").trim();

  const text = [
    `Buongiorno ${supplier?.name ?? ""},`,
    "",
    customMessage || "in allegato trovate il nostro ordine di acquisto.",
    "",
    `Riferimento ordine: ${order.code}`,
    `Data ordine: ${fmtDate(order.orderedAt)}`,
    `Consegna attesa: ${fmtDate(order.expectedAt)}`,
    "",
    "Articoli:",
    itemsText,
    "",
    `Totale ordine: € ${order.total.toFixed(2)}`,
    "",
    `${tenant?.name ?? "RistoSaaS"}`,
  ].join("\n");

  const subject = `Ordine ${order.code} — ${tenant?.name ?? "RistoSaaS"}`;

  const result = await sendTenantMail({
    tenantId,
    to: recipients,
    subject,
    text,
    attachments,
  });

  if (!result.ok) {
    if (result.reason === "smtp_not_configured") {
      return err("SMTP del tenant non configurato.", 400);
    }
    if (result.reason === "invalid_recipient") {
      return err("Indirizzo email destinatario non valido.", 400);
    }
    return err(result.error || "Invio email fallito.", 502);
  }

  // Avanza automaticamente bozza -> inviato quando si manda l'email
  if (order.status === "bozza") {
    await purchaseOrdersRepository.setStatus(tenantId, order.id, "inviato").catch(() => {});
  }

  return ok({ ok: true, messageId: result.messageId, recipients });
}
