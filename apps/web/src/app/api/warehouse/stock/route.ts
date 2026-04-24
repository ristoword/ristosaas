import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseRepository } from "@/lib/db/repositories/warehouse.repository";
import type { StockItem } from "@/lib/api/types/warehouse";

const WAREHOUSE_ROLES = ["magazzino", "cucina", "pizzeria", "bar", "supervisor", "owner", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const items = await warehouseRepository.listItemsWithLocations(getTenantId());
  const lowStock = items.filter((s) => s.totalQty <= s.minStock);
  const alerts = lowStock.map((item) => ({
    id: item.id,
    name: item.name,
    qty: item.totalQty,
    minStock: item.minStock,
    level: item.totalQty <= 0 ? "critical" : "warning",
    message:
      item.totalQty <= 0
        ? `Scorta esaurita: ${item.name}`
        : `Sotto scorta minima: ${item.name} (${item.totalQty}/${item.minStock})`,
  }));
  return ok({
    items,
    lowStock,
    alerts,
    totalValue: items.reduce((s, i) => s + i.qty * i.costPerUnit, 0),
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ["magazzino", "supervisor", "owner", "super_admin"]);
  if (guard.error) return guard.error;
  const data = await body<Omit<StockItem, "id">>(req);
  if (!data.name?.trim()) return err("name is required");
  const item = await warehouseRepository.createItem(getTenantId(), data);
  return ok(item, 201);
}
