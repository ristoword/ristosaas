import { NextRequest } from "next/server";
import type { SalaTable } from "@/lib/api/types/rooms";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { operationsRepository } from "@/lib/db/repositories/operations.repository";

type Ctx = { params: Promise<{ id: string }> };
const TABLE_ROLES = ["owner", "supervisor", "sala", "cassa", "super_admin"] as const;

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, TABLE_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const table = await operationsRepository.tables.get(getTenantId(), id);
  if (!table) return err("Table not found", 404);
  return ok(table);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, TABLE_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const updates = await body<Partial<SalaTable>>(req);
  const updated = await operationsRepository.tables.update(getTenantId(), id, updates);
  if (!updated) return err("Table not found", 404);
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, TABLE_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await operationsRepository.tables.delete(getTenantId(), id);
  return deleted ? ok({ deleted: true }) : err("Table not found", 404);
}
