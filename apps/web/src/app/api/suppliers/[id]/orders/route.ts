import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { purchaseOrdersRepository } from "@/lib/db/repositories/purchase-orders.repository";

const ROLES = ["owner", "supervisor", "magazzino", "cassa", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/suppliers/:id/orders — elenco ordini emessi al fornitore. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = getTenantId();
  const orders = await purchaseOrdersRepository.list(tenantId, { supplierId: id });
  return ok(orders);
}

/** POST /api/suppliers/:id/orders — crea un nuovo ordine fornitore. */
export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const payload = await body<{
    notes?: string;
    status?: "bozza" | "inviato";
    expectedAt?: string | null;
    items?: Array<{
      warehouseItemId: string;
      qtyOrdered: number;
      unit: string;
      unitCost: number;
      notes?: string;
    }>;
  }>(req);
  if (!payload?.items || payload.items.length === 0) {
    return err("Almeno una riga ordine e richiesta.", 400);
  }
  try {
    const created = await purchaseOrdersRepository.create(getTenantId(), {
      supplierId: id,
      status: payload.status ?? "bozza",
      notes: payload.notes ?? "",
      expectedAt: payload.expectedAt ?? null,
      items: payload.items,
    });
    return ok(created, 201);
  } catch (error) {
    return err(error instanceof Error ? error.message : "Creazione ordine fallita.", 400);
  }
}
