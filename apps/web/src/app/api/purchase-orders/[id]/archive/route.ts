import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { archivedSupplierOrdersRepository } from "@/lib/db/repositories/archived-supplier-orders.repository";
import { purchaseOrdersRepository } from "@/lib/db/repositories/purchase-orders.repository";

const ROLES = ["owner", "supervisor", "magazzino", "cassa", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/purchase-orders/:id/archive — archivia documento (bozza o ordine emesso). */
export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = getTenantId();

  const payload = await body<{ kind?: "bozza_confermata" | "ordine_confermato" }>(req);
  const kind = payload?.kind;
  if (kind !== "bozza_confermata" && kind !== "ordine_confermato") {
    return err("kind deve essere bozza_confermata o ordine_confermato.", 400);
  }

  try {
    await archivedSupplierOrdersRepository.createFromPurchaseOrder(tenantId, id, kind);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Archiviazione non riuscita.";
    if (msg.includes("già stato archiviato")) return err(msg, 409);
    return err(msg, 400);
  }

  const order = await purchaseOrdersRepository.get(tenantId, id);
  if (!order) return err("Ordine non trovato.", 404);
  return ok({ order });
}
