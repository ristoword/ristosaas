import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseRepository } from "@/lib/db/repositories/warehouse.repository";
import type { WarehouseEquipment } from "@/lib/api/types/warehouse";

const WAREHOUSE_ROLES = ["magazzino", "supervisor"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const existing = await warehouseRepository.getEquipment(getTenantId(), id);
  if (!existing) return err("Equipment not found", 404);
  const updates = await body<Partial<WarehouseEquipment>>(req);
  const updated = await warehouseRepository.updateEquipment(getTenantId(), id, updates);
  if (!updated) return err("Equipment not found", 404);
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await warehouseRepository.deleteEquipment(getTenantId(), id);
  if (!deleted) return err("Equipment not found", 404);
  return ok({ deleted: true });
}
