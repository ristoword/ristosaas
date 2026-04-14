import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { operationsRepository } from "@/lib/db/repositories/operations.repository";
type Ctx = { params: Promise<{ id: string }> };
const BOOKING_ROLES = ["sala", "cassa", "supervisor"] as const;

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...BOOKING_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const i = await operationsRepository.bookings.get(getTenantId(), id);
  return i ? ok(i) : err("Not found", 404);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...BOOKING_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const u = await body<any>(req);
  const up = await operationsRepository.bookings.update(getTenantId(), id, u);
  return up ? ok(up) : err("Not found", 404);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...BOOKING_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await operationsRepository.bookings.delete(getTenantId(), id);
  return deleted ? ok({ deleted: true }) : err("Not found", 404);
}
