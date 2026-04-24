import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const WAREHOUSE_ROLES = ["magazzino", "supervisor", "owner", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/warehouse/movements/:id
 * Aggiorna i campi testuali di un movimento (reason, note).
 * NON ricalcola retroattivamente le quantità: quella logica è già avvenuta.
 * Per correggere le quantità usare una rettifica.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const tenantId = getTenantId();

  const existing = await prisma.warehouseMovement.findFirst({
    where: { id, tenantId },
    include: { item: { select: { name: true } } },
  });
  if (!existing) return err("Movimento non trovato", 404);

  const data = await body<{ reason?: string; note?: string }>(req);

  const updated = await prisma.warehouseMovement.update({
    where: { id },
    data: {
      reason: data.reason !== undefined ? data.reason.trim() : undefined,
      note: data.note !== undefined ? data.note.trim() || null : undefined,
    },
    include: { item: { select: { name: true } } },
  });

  return ok({
    id: updated.id,
    date: updated.date.toISOString().slice(0, 10),
    productId: updated.warehouseItemId,
    productName: updated.item.name,
    type: updated.type,
    qty: updated.qty.toNumber(),
    unit: updated.unit,
    reason: updated.reason,
    fromLocation: updated.fromLocation,
    toLocation: updated.toLocation,
    note: updated.note,
    orderId: updated.orderId || undefined,
  });
}
