import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseRepository } from "@/lib/db/repositories/warehouse.repository";
import type { StockItem } from "@/lib/api/types/warehouse";

const WAREHOUSE_ROLES = ["magazzino", "supervisor"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const items = await warehouseRepository.listItems(getTenantId());
  const lowStock = items.filter((s) => s.qty <= s.minStock);
  const alerts = lowStock.map((item) => ({
    id: item.id,
    name: item.name,
    qty: item.qty,
    minStock: item.minStock,
    level: item.qty <= 0 ? "critical" : "warning",
    message:
      item.qty <= 0
        ? `Scorta esaurita: ${item.name}`
        : `Sotto scorta minima: ${item.name} (${item.qty}/${item.minStock})`,
  }));
  return ok({
    items,
    lowStock,
    alerts,
    totalValue: items.reduce((s, i) => s + i.qty * i.costPerUnit, 0),
  });
}

export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const data = await body<Omit<StockItem, "id">>(req);
  if (!data.name?.trim()) return err("name is required");
  const item = await warehouseRepository.createItem(getTenantId(), data);
  return ok(item, 201);
}
