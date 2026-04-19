import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { customersRepository } from "@/lib/db/repositories/customers.repository";
type Ctx = { params: Promise<{ id: string }> };
const CUSTOMER_ROLES = ["owner", "supervisor", "sala", "cassa", "hotel_manager", "reception", "super_admin"] as const;
export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, CUSTOMER_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const i = await customersRepository.get(getTenantId(), id);
  return i ? ok(i) : err("Not found", 404);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, CUSTOMER_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const u = await body<Record<string, unknown>>(req);
  const up = await customersRepository.update(getTenantId(), id, u as never);
  return up ? ok(up) : err("Not found", 404);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, CUSTOMER_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await customersRepository.delete(getTenantId(), id);
  return deleted ? ok({ deleted: true }) : err("Not found", 404);
}
