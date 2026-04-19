import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseRepository } from "@/lib/db/repositories/warehouse.repository";
import type { WarehouseEquipment } from "@/lib/api/types/warehouse";

const WAREHOUSE_ROLES = ["magazzino", "supervisor"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const rows = await warehouseRepository.listEquipment(getTenantId());
  return ok(rows);
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const data = await body<Omit<WarehouseEquipment, "id">>(req);
  if (!data.name?.trim()) return err("name is required");
  if (!data.location?.trim()) return err("location is required");
  const item = await warehouseRepository.createEquipment(getTenantId(), {
    ...data,
    qty: Number.isFinite(data.qty) ? Math.max(0, Math.floor(data.qty)) : 0,
    value: Number.isFinite(data.value) ? Math.max(0, data.value) : 0,
  });
  return ok(item, 201);
}
