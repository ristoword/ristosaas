import { NextRequest } from "next/server";
import { db, uid } from "@/lib/api/store";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const WAREHOUSE_ROLES = ["magazzino", "supervisor"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const items = db.stock.all();
  const lowStock = items.filter((s) => s.qty <= s.minStock);
  return ok({ items, lowStock, totalValue: items.reduce((s, i) => s + i.qty * i.costPerUnit, 0) });
}

export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const data = await body<any>(req);
  if (!data.name?.trim()) return err("name is required");
  const id = uid("ws");
  const item = { ...data, id };
  db.stock.set(id, item);
  return ok(item, 201);
}
