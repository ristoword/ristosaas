import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import type { TableStatus } from "@/lib/api/types/rooms";
import { ok, err, body } from "@/lib/api/helpers";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/tables/:id/status — change table status */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const table = db.tables.get(id);
  if (!table) return err("Table not found", 404);

  const { stato } = await body<{ stato: TableStatus }>(req);
  if (!stato) return err("stato is required");

  const updated = { ...table, stato };
  db.tables.set(id, updated);
  return ok(updated);
}
