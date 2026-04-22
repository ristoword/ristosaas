import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { archivedSupplierOrdersRepository } from "@/lib/db/repositories/archived-supplier-orders.repository";

const ROLES = ["owner", "supervisor", "super_admin", "cassa", "magazzino"] as const;

/** GET /api/archivio/ordini-fornitore — elenco documenti ordine fornitore archiviati. */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const rows = await archivedSupplierOrdersRepository.list(getTenantId());
  return ok(rows);
}
