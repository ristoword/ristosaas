import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { guestFolioRepository } from "@/lib/db/repositories/guest-folio.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { sendTenantMail } from "@/lib/email/send-tenant-mail";
import { actorFromRequest, writeFolioAudit } from "@/lib/hotel/folio-service";
import { buildEnterpriseFolioPdf } from "@/lib/hotel/folio-pdf";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{ toEmail: string; subject?: string; template?: string }>(req);

  if (!payload.toEmail?.trim()) return err("toEmail required", 400);

  const detail = await guestFolioRepository.getDetail(tenantId, id);
  if (!detail) return err("Folio not found", 404);

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  const pdf = await buildEnterpriseFolioPdf({
    tenantName: tenant?.name ?? "Hotel",
    folio: detail.folio,
    charges: detail.charges,
    folioId: id,
  });

  const subject = payload.subject?.trim() || `Guest Folio — ${detail.folio.guestName ?? detail.folio.roomCode ?? id}`;
  const result = await sendTenantMail({
    tenantId,
    to: payload.toEmail.trim(),
    subject,
    text: `In allegato il folio del soggiorno. Saldo: ${detail.folio.currency} ${detail.folio.balance.toFixed(2)}`,
    html: `<p>Gentile ospite,</p><p>In allegato il riepilogo del conto.</p><p>Saldo: <strong>${detail.folio.currency} ${detail.folio.balance.toFixed(2)}</strong></p>`,
    attachments: [{ filename: `folio-${id}.pdf`, content: pdf, contentType: "application/pdf" }],
    templateSlug: payload.template ?? "folio_guest",
  });

  const status = result.ok ? "sent" : "error";
  await prisma.folioEmailLog.create({
    data: {
      tenantId,
      folioId: id,
      toEmail: payload.toEmail.trim(),
      subject,
      template: payload.template ?? "folio_guest",
      status,
      error: result.ok ? null : result.error ?? result.reason,
    },
  });

  await writeFolioAudit({
    tenantId,
    folioId: id,
    action: result.ok ? "folio_emailed" : "folio_email_failed",
    newValue: payload.toEmail,
    actor: actorFromRequest(guard.user, req.headers),
  });

  if (!result.ok) return err(result.error ?? result.reason, 400);
  return ok({ sent: true, messageId: result.messageId });
}
