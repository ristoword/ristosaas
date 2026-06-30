import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseBollaImportRepository } from "@/lib/db/repositories/warehouse-bolla-import.repository";
import { BOLLA_IMPORT_ROLES } from "@/lib/warehouse/bolla-import/permissions";

const ROLES = BOLLA_IMPORT_ROLES;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const tenantId = guard.user.tenantId || getTenantId();

  try {
    await warehouseBollaImportRepository.undoImport(tenantId, id, guard.user.id, guard.user.name);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Annullamento non riuscito", 400);
  }

  const updated = await warehouseBollaImportRepository.getById(tenantId, id);
  return ok({ import: updated });
}
