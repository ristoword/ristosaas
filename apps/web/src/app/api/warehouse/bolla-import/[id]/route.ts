import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseBollaImportRepository } from "@/lib/db/repositories/warehouse-bolla-import.repository";

const ROLES = ["magazzino", "supervisor", "owner", "super_admin"] as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const tenantId = getTenantId();
  const record = await warehouseBollaImportRepository.getById(tenantId, id);
  if (!record) return err("Importazione non trovata", 404);
  const audit = await warehouseBollaImportRepository.listAudit(tenantId, id);
  return ok({ import: record, audit });
}
