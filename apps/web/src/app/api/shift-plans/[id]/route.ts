import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const SHIFT_ROLES = ["cucina", "pizzeria", "bar", "sala", "supervisor", "owner", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

const SELECT = {
  id: true, area: true, day: true, staffName: true, staffId: true,
  startTime: true, endTime: true, hours: true, role: true,
  shiftType: true, notes: true, createdAt: true, updatedAt: true,
} as const;

function serialize(r: { createdAt: Date; updatedAt: Date; [k: string]: unknown }) {
  return { ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
}

/** PUT /api/shift-plans/:id */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...SHIFT_ROLES]);
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const tenantId = getTenantId();

  const existing = await prisma.shiftPlan.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) return err("Turno non trovato", 404);

  const data = await body<{
    area?: string; day?: string; staffName?: string; staffId?: string | null;
    startTime?: string; endTime?: string; hours?: string; role?: string;
    shiftType?: string; notes?: string;
  }>(req);

  const row = await prisma.shiftPlan.update({
    where: { id },
    data: {
      ...(data.area !== undefined && { area: data.area.trim() }),
      ...(data.day !== undefined && { day: data.day.trim() }),
      ...(data.staffName !== undefined && { staffName: data.staffName.trim() }),
      ...(data.staffId !== undefined && { staffId: data.staffId?.trim() || null }),
      ...(data.startTime !== undefined && { startTime: data.startTime.trim() }),
      ...(data.endTime !== undefined && { endTime: data.endTime.trim() }),
      ...(data.hours !== undefined && { hours: data.hours.trim() }),
      ...(data.role !== undefined && { role: data.role.trim() }),
      ...(data.shiftType !== undefined && { shiftType: data.shiftType.trim() }),
      ...(data.notes !== undefined && { notes: data.notes.trim() }),
    },
    select: SELECT,
  });

  return ok(serialize(row));
}

/** DELETE /api/shift-plans/:id */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...SHIFT_ROLES]);
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const tenantId = getTenantId();

  const existing = await prisma.shiftPlan.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) return err("Turno non trovato", 404);

  await prisma.shiftPlan.delete({ where: { id } });
  return ok({ deleted: true });
}
