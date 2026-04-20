import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { purchaseOrdersRepository } from "@/lib/db/repositories/purchase-orders.repository";

const ROLES = ["owner", "supervisor", "magazzino", "cassa", "super_admin"] as const;

/**
 * GET /api/purchase-orders/report?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Aggregato acquisti per fornitore nel periodo scelto.
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const report = await purchaseOrdersRepository.report(getTenantId(), { from, to });
  return ok(report);
}
