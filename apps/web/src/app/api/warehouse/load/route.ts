import { NextRequest } from "next/server";
import { db, uid } from "@/lib/api/store";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const WAREHOUSE_ROLES = ["magazzino", "supervisor"] as const;

export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const { productId, qty, reason } = await body<{ productId: string; qty: number; reason?: string }>(req);
  if (!productId || !qty) return err("productId and qty required");
  const item = db.stock.get(productId);
  if (!item) return err("Stock item not found", 404);
  db.stock.set(productId, { ...item, qty: item.qty + qty });
  db.stockMovements.push({ id: uid("mv"), date: new Date().toISOString().slice(0, 10), productId, productName: item.name, type: "carico", qty, unit: item.unit, reason: reason || "Carico manuale" });
  return ok({ item: db.stock.get(productId), movement: "recorded" });
}
