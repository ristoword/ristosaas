import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { adminRepository } from "@/lib/db/repositories/admin.repository";
import { sendTenantMail } from "@/lib/email/send-tenant-mail";
import { prisma } from "@/lib/db/prisma";

const ADMIN_ROLES = ["super_admin"] as const;
type Ctx = { params: Promise<{ tenantId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;
  const { tenantId } = await ctx.params;

  let body: { to?: string } = {};
  try {
    body = (await req.json().catch(() => ({}))) as { to?: string };
  } catch {
    body = {};
  }

  const config = await prisma.tenantEmailConfig.findUnique({ where: { tenantId } });
  if (!config) return err("Configurazione SMTP non trovata per il tenant", 404);

  const recipient = (body.to || "").trim() || config.fromAddress;
  if (!recipient) return err("Specificare un destinatario per il test");

  const result = await sendTenantMail({
    tenantId,
    to: recipient,
    subject: "[RistoSaaS] Test configurazione SMTP",
    text: `Questa e una email di test inviata da RistoSaaS per verificare la configurazione SMTP del tenant.\n\nHost: ${config.host}\nPort: ${config.port}\nUser: ${config.username}\nFrom: ${config.fromAddress}\n\nSe ricevi questa email significa che la configurazione funziona correttamente.`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 560px; padding: 16px;">
        <h2 style="color: #2563eb;">Test configurazione SMTP</h2>
        <p>Questa email e stata inviata da <strong>RistoSaaS</strong> per verificare la configurazione SMTP del tenant.</p>
        <table style="border-collapse: collapse; margin-top: 12px;">
          <tr><td style="padding: 4px 8px; color: #6b7280;">Host</td><td style="padding: 4px 8px;"><code>${config.host}</code></td></tr>
          <tr><td style="padding: 4px 8px; color: #6b7280;">Port</td><td style="padding: 4px 8px;"><code>${config.port}</code></td></tr>
          <tr><td style="padding: 4px 8px; color: #6b7280;">User</td><td style="padding: 4px 8px;"><code>${config.username}</code></td></tr>
          <tr><td style="padding: 4px 8px; color: #6b7280;">From</td><td style="padding: 4px 8px;"><code>${config.fromAddress}</code></td></tr>
        </table>
        <p style="margin-top: 16px; color: #059669;"><strong>OK</strong> - Configurazione funzionante.</p>
      </div>
    `,
  });

  if (!result.ok) {
    const updated = await adminRepository.testEmailConfig(tenantId, false);
    return ok({
      ...updated,
      error: result.reason === "smtp_not_configured"
        ? "SMTP non configurato completamente"
        : result.reason === "invalid_recipient"
        ? "Destinatario non valido"
        : result.error || "Invio fallito",
    });
  }

  const updated = await adminRepository.testEmailConfig(tenantId, true);
  return ok({ ...updated, messageId: result.messageId, recipient });
}
