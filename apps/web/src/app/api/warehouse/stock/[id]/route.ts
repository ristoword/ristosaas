import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseRepository } from "@/lib/db/repositories/warehouse.repository";
import type { StockItem } from "@/lib/api/types/warehouse";

const WAREHOUSE_ROLES = ["magazzino", "supervisor", "owner", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const existing = await warehouseRepository.getItem(getTenantId(), id);
  if (!existing) return err("Stock item not found", 404);
  const updates = await body<Partial<StockItem>>(req);
  const updated = await warehouseRepository.updateItem(getTenantId(), id, updates);
  if (!updated) return err("Stock item not found", 404);
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await warehouseRepository.deleteItem(getTenantId(), id);
  if (!deleted) return err("Not found", 404);
  return ok({ deleted: true });
}
