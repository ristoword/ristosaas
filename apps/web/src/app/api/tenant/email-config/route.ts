import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { adminRepository } from "@/lib/db/repositories/admin.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { mapTenantEmailConfigPublic } from "@/lib/email/tenant-email-config";
import { prisma } from "@/lib/db/prisma";

const EMAIL_ROLES = ["owner", "supervisor", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, EMAIL_ROLES);
  if (guard.error) return guard.error;
  const tenantId = getTenantId();
  const row = await prisma.tenantEmailConfig.findUnique({
    where: { tenantId },
    include: { tenant: { select: { name: true } } },
  });
  if (!row) return ok(null);
  return ok(mapTenantEmailConfigPublic(row));
}

export async function PUT(req: NextRequest) {
  const guard = await requireApiUser(req, EMAIL_ROLES);
  if (guard.error) return guard.error;
  const tenantId = getTenantId();
  const payload = await body<Record<string, unknown>>(req);
  try {
    return ok(await adminRepository.upsertEmailConfig(tenantId, payload));
  } catch (e) {
    return err(e instanceof Error ? e.message : "Salvataggio fallito", 400);
  }
}
