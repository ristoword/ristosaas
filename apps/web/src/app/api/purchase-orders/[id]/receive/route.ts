import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { purchaseOrdersRepository } from "@/lib/db/repositories/purchase-orders.repository";

const ROLES = ["owner", "supervisor", "magazzino", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/purchase-orders/:id/receive
 * Body: { receipts: Array<{ itemId: string; qty: number }> }
 *
 * Registra la ricezione di merce: aggiorna qtyReceived di ogni riga,
 * incrementa WarehouseItem.qty, ricalcola costPerUnit a media ponderata,
 * crea WarehouseMovement di tipo carico e WarehouseCostHistory.
 * Alla fine deriva lo stato (parziale/ricevuto) e imposta receivedAt.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const payload = await body<{ receipts?: Array<{ itemId: string; qty: number }> }>(req);
  if (!payload?.receipts || payload.receipts.length === 0) {
    return err("Nessuna riga da ricevere.", 400);
  }
  try {
    const row = await purchaseOrdersRepository.receive(
      getTenantId(),
      id,
      payload.receipts.filter((r) => r.qty > 0 && typeof r.itemId === "string"),
    );
    if (!row) return err("Ordine non trovato.", 404);
    return ok(row);
  } catch (error) {
    return err(error instanceof Error ? error.message : "Ricezione fallita.", 400);
  }
}
