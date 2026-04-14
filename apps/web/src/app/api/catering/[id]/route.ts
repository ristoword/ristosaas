import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { operationsRepository } from "@/lib/db/repositories/operations.repository";
type Ctx = { params: Promise<{ id: string }> };
const CATERING_ROLES = ["owner", "supervisor", "sala", "cassa", "super_admin"] as const;
export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, CATERING_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const i = await operationsRepository.catering.get(getTenantId(), id);
  return i ? ok(i) : err("Not found", 404);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, CATERING_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const u = await body<any>(req);
  const up = await operationsRepository.catering.update(getTenantId(), id, u);
  return up ? ok(up) : err("Not found", 404);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, CATERING_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await operationsRepository.catering.delete(getTenantId(), id);
  return deleted ? ok({ deleted: true }) : err("Not found", 404);
}
