import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { actorFromRequest, writeHkAudit } from "@/lib/hotel/housekeeping-service";
import { emitHousekeepingEvent } from "@/lib/hotel/housekeeping-event-bus";
import type { MaintenanceTicketStatus } from "@prisma/client";

const ROLES = ["hotel_manager", "reception", "housekeeping", "supervisor", "owner", "super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{
    status?: MaintenanceTicketStatus;
    assignedToUserId?: string;
    actualMin?: number;
    cost?: number;
    materials?: string;
  }>(req);

  const existing = await prisma.maintenanceTicket.findFirst({ where: { id, tenantId } });
  if (!existing) return err("Ticket not found", 404);

  const actor = actorFromRequest(guard.user, req.headers);

  const ticket = await prisma.$transaction(async (tx) => {
    const row = await tx.maintenanceTicket.update({
      where: { id },
      data: {
        status: payload.status,
        assignedToUserId: payload.assignedToUserId,
        actualMin: payload.actualMin,
        cost: payload.cost,
        materials: payload.materials,
        resolvedAt: payload.status === "resolved" || payload.status === "closed" ? new Date() : undefined,
      },
    });

    if (payload.status === "resolved" || payload.status === "closed") {
      await tx.hotelRoom.update({
        where: { id: existing.roomId },
        data: { status: "da_pulire", hkPmsCode: "VD" },
      });
    }

    await writeHkAudit(
      {
        tenantId,
        roomId: existing.roomId,
        action: "maintenance_updated",
        oldValue: existing.status,
        newValue: payload.status ?? existing.status,
        actor,
      },
      tx,
    );

    return row;
  });

  emitHousekeepingEvent(tenantId, { reason: "maintenance_updated", roomId: existing.roomId });
  return ok({ ticket });
}
