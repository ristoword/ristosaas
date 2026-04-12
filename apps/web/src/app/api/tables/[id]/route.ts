import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import type { SalaTable } from "@/lib/api/types/rooms";
import { ok, err, body } from "@/lib/api/helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const table = db.tables.get(id);
  if (!table) return err("Table not found", 404);
  return ok(table);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = db.tables.get(id);
  if (!existing) return err("Table not found", 404);
  const updates = await body<Partial<SalaTable>>(req);
  const updated: SalaTable = { ...existing, ...updates, id };
  db.tables.set(id, updated);
  return ok(updated);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!db.tables.get(id)) return err("Table not found", 404);
  db.tables.delete(id);
  return ok({ deleted: true });
}
