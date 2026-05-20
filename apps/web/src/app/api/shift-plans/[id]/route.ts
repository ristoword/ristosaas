import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const SHIFT_ROLES = ["cucina", "pizzeria", "bar", "sala", "supervisor", "owner", "super_admin", "hotel_manager"] as const;

type Ctx = { params: Promise<{ id: string }> };

const SELECT = {
  id: true, area: true, day: true, staffName: true, staffId: true,
  startTime: true, endTime: true, hours: true, role: true,
  shiftType: true, notes: true, assignedRooms: true, leaveApproval: true, createdAt: true, updatedAt: true,
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

  const existing = await prisma.shiftPlan.findFirst({
    where: { id, tenantId },
    select: { id: true, area: true, day: true, staffId: true, staffName: true, assignedRooms: true },
  });
  if (!existing) return err("Turno non trovato", 404);

  const data = await body<{
    area?: string; day?: string; staffName?: string; staffId?: string | null;
    startTime?: string; endTime?: string; hours?: string; role?: string;
    shiftType?: string; notes?: string; leaveApproval?: string; assignedRooms?: string[] | null;
  }>(req);

  const updatePayload: Record<string, unknown> = {};
  if (data.area !== undefined) updatePayload.area = data.area.trim();
  if (data.day !== undefined) updatePayload.day = data.day.trim();
  if (data.staffName !== undefined) updatePayload.staffName = data.staffName.trim();
  if (data.staffId !== undefined) updatePayload.staffId = data.staffId?.trim() || null;
  if (data.startTime !== undefined) updatePayload.startTime = data.startTime.trim();
  if (data.endTime !== undefined) updatePayload.endTime = data.endTime.trim();
  if (data.hours !== undefined) updatePayload.hours = data.hours.trim();
  if (data.role !== undefined) updatePayload.role = data.role.trim();
  if (data.shiftType !== undefined) updatePayload.shiftType = data.shiftType.trim();
  if (data.notes !== undefined) updatePayload.notes = data.notes.trim();
  if (data.leaveApproval !== undefined) updatePayload.leaveApproval = data.leaveApproval.trim();
  if (data.assignedRooms !== undefined) updatePayload.assignedRooms = data.assignedRooms;

  const row = await prisma.shiftPlan.update({
    where: { id },
    data: updatePayload,
    select: SELECT,
  });

  const effectiveArea = data.area?.trim() ?? existing.area;
  if (effectiveArea === "housekeeping" && data.assignedRooms !== undefined) {
    const effectiveDay = data.day?.trim() ?? existing.day;
    const effectiveStaffId = data.staffId !== undefined ? (data.staffId?.trim() || null) : existing.staffId;
    const effectiveStaffName = data.staffName?.trim() ?? existing.staffName;
    const assignedToUserId = effectiveStaffId || effectiveStaffName;
    const scheduledFor = new Date(effectiveDay + "T08:00:00");

    const oldRooms: string[] = Array.isArray(existing.assignedRooms) ? (existing.assignedRooms as string[]) : [];
    const newRooms: string[] = data.assignedRooms ?? [];

    const removedRooms = oldRooms.filter((r) => !newRooms.includes(r));
    if (removedRooms.length > 0) {
      await prisma.housekeepingTask.deleteMany({
        where: {
          tenantId,
          roomId: { in: removedRooms },
          assignedToUserId,
          scheduledFor,
          status: "todo",
        },
      });
    }

    const addedRooms = newRooms.filter((r) => !oldRooms.includes(r));
    if (addedRooms.length > 0) {
      await prisma.housekeepingTask.createMany({
        data: addedRooms.map((roomId) => ({
          tenantId,
          roomId,
          assignedToUserId,
          status: "todo",
          scheduledFor,
        })),
        skipDuplicates: true,
      });
    }
  }

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
