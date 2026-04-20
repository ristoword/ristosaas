import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseRepository } from "@/lib/db/repositories/warehouse.repository";

const WAREHOUSE_ROLES = ["magazzino", "supervisor", "owner", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const { productId, qty, reason } = await body<{ productId: string; qty: number; reason?: string }>(req);
  if (!productId || !qty) return err("productId and qty required");
  const tenantId = getTenantId();
  const item = await warehouseRepository.getItem(tenantId, productId);
  if (!item) return err("Stock item not found", 404);
  const updated = await warehouseRepository.updateItem(tenantId, productId, { qty: item.qty + qty });
  await warehouseRepository.createMovement({
    tenantId,
    warehouseItemId: productId,
    type: "carico",
    qty,
    unit: item.unit,
    reason: reason || "Carico manuale",
  });
  return ok({ item: updated, movement: "recorded" });
}
