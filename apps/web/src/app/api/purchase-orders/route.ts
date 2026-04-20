import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { purchaseOrdersRepository, type PurchaseOrderStatus } from "@/lib/db/repositories/purchase-orders.repository";

const ROLES = ["owner", "supervisor", "magazzino", "cassa", "super_admin"] as const;

/** GET /api/purchase-orders — lista globale filtrabile per stato. */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const statusParam = req.nextUrl.searchParams.get("status");
  const status = statusParam && ["bozza", "inviato", "parziale", "ricevuto", "annullato"].includes(statusParam)
    ? (statusParam as PurchaseOrderStatus)
    : undefined;
  const orders = await purchaseOrdersRepository.list(getTenantId(), { status });
  return ok(orders);
}
