import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { sendTenantMail } from "@/lib/email/send-tenant-mail";
import { adminRepository } from "@/lib/db/repositories/admin.repository";

const EMAIL_ROLES = ["owner", "supervisor", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, EMAIL_ROLES);
  if (guard.error) return guard.error;
  const tenantId = getTenantId();
  const payload = await body<{ to?: string }>(req).catch(() => ({ to: "" }));
  const config = await prisma.tenantEmailConfig.findUnique({ where: { tenantId } });
  if (!config) return err("Configurazione email non trovata", 404);
  const recipient = (payload.to || "").trim() || config.fromAddress;
  const result = await sendTenantMail({
    tenantId,
    to: recipient,
    subject: "[RistoSimply] Test SMTP",
    text: "Test invio SMTP dal gestionale.",
  });
  if (!result.ok) return err(result.error ?? result.reason, 400);
  await adminRepository.testEmailConfig(tenantId, true);
  return ok({ messageId: result.messageId, recipient });
}
