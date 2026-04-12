import { NextRequest } from "next/server";
import { db, uid } from "@/lib/api/store";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const WAREHOUSE_ROLES = ["magazzino", "supervisor"] as const;

export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const { productName, qty, reason } = await body<{ productName: string; qty: number; reason: string }>(req);
  if (!productName || !qty) return err("productName and qty required");
  const item = db.stock.findByName(productName);
  if (!item) return err("Product not found in stock", 404);
  db.stock.set(item.id, { ...item, qty: Math.max(0, item.qty - qty) });
  db.stockMovements.push({ id: uid("mv"), date: new Date().toISOString().slice(0, 10), productId: item.id, productName: item.name, type: "scarico", qty, unit: item.unit, reason });
  return ok({ item: db.stock.get(item.id) });
}
