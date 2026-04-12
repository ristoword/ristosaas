import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const WAREHOUSE_ROLES = ["magazzino", "supervisor"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const existing = db.stock.get(id);
  if (!existing) return err("Stock item not found", 404);
  const updates = await body<any>(req);
  const updated = { ...existing, ...updates, id };
  db.stock.set(id, updated);
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  if (!db.stock.get(id)) return err("Not found", 404);
  db.stock.delete(id);
  return ok({ deleted: true });
}
