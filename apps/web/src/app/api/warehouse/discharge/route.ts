import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseRepository } from "@/lib/db/repositories/warehouse.repository";

const WAREHOUSE_ROLES = ["magazzino", "supervisor", "owner", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const { productName, qty, reason } = await body<{ productName: string; qty: number; reason: string }>(req);
  if (!productName || !qty) return err("productName and qty required");
  const tenantId = getTenantId();
  const item = await warehouseRepository.findByName(tenantId, productName);
  if (!item) return err("Product not found in stock", 404);
  const updated = await warehouseRepository.updateItem(tenantId, item.id, {
    qty: Math.max(0, item.qty - qty),
  });
  await warehouseRepository.createMovement({
    tenantId,
    warehouseItemId: item.id,
    type: "scarico",
    qty,
    unit: item.unit,
    reason,
  });
  return ok({ item: updated });
}
