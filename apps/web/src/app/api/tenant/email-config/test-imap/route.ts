import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { testImapConnection } from "@/lib/email/imap-client";

const EMAIL_ROLES = ["owner", "supervisor", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, EMAIL_ROLES);
  if (guard.error) return guard.error;
  const tenantId = getTenantId();
  const config = await prisma.tenantEmailConfig.findUnique({ where: { tenantId } });
  if (!config) return err("Configurazione email non trovata", 404);
  const result = await testImapConnection(config);
  if (!result.ok) return err(result.error, 400);
  return ok({ ok: true });
}
