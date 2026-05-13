import { NextRequest } from "next/server";
import { ok, err, body, withErrorHandler} from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { operationsRepository } from "@/lib/db/repositories/operations.repository";
type Ctx = { params: Promise<{ id: string }> };
const SUPPLIER_ROLES = ["owner", "supervisor", "magazzino", "cassa", "super_admin"] as const;
export const GET = withErrorHandler(async (req, ctx) => {
  const guard = await requireApiUser(req, SUPPLIER_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const i = await operationsRepository.suppliers.get(getTenantId(), id);
  return i ? ok(i) : err("Not found", 404);
});
export const PUT = withErrorHandler(async (req, ctx) => {
  const guard = await requireApiUser(req, SUPPLIER_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const u = await body<any>(req);
  const up = await operationsRepository.suppliers.update(getTenantId(), id, u);
  return up ? ok(up) : err("Not found", 404);
});
export const DELETE = withErrorHandler(async (req, ctx) => {
  const guard = await requireApiUser(req, SUPPLIER_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await operationsRepository.suppliers.delete(getTenantId(), id);
  return deleted ? ok({ deleted: true }) : err("Not found", 404);
});
