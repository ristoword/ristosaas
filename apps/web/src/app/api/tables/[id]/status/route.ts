import { NextRequest } from "next/server";
import type { TableStatus } from "@/lib/api/types/rooms";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { operationsRepository } from "@/lib/db/repositories/operations.repository";

type Ctx = { params: Promise<{ id: string }> };
const TABLE_ROLES = ["owner", "supervisor", "sala", "cassa", "super_admin"] as const;

/** PATCH /api/tables/:id/status — change table status */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, TABLE_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;

  const { stato } = await body<{ stato: TableStatus }>(req);
  if (!stato) return err("stato is required");

  const updated = await operationsRepository.tables.setStatus(getTenantId(), id, stato);
  if (!updated) return err("Table not found", 404);
  return ok(updated);
}
