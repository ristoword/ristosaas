import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { actorFromRequest, writeHkAudit } from "@/lib/hotel/housekeeping-service";
import { emitHousekeepingEvent } from "@/lib/hotel/housekeeping-event-bus";
import type { MaintenancePriority, MaintenanceTicketStatus } from "@prisma/client";

const ROLES = ["hotel_manager", "reception", "housekeeping", "supervisor", "owner", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();

  const tickets = await prisma.maintenanceTicket.findMany({
    where: { tenantId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { room: { select: { code: true, floor: true } } },
    take: 100,
  });

  return ok({ tickets });
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{
    roomId?: string;
    title?: string;
    description?: string;
    priority?: MaintenancePriority;
    assignedToUserId?: string;
    materials?: string;
    cost?: number;
    estimatedMin?: number;
    photosJson?: string;
  }>(req);

  if (!payload.roomId || !payload.title) return err("roomId and title required");

  const actor = actorFromRequest(guard.user, req.headers);

  const ticket = await prisma.$transaction(async (tx) => {
    const row = await tx.maintenanceTicket.create({
      data: {
        tenantId,
        roomId: payload.roomId!,
        title: payload.title!,
        description: payload.description ?? "",
        priority: payload.priority ?? "normal",
        assignedToUserId: payload.assignedToUserId ?? null,
        materials: payload.materials ?? null,
        cost: payload.cost ?? null,
        estimatedMin: payload.estimatedMin ?? null,
        photosJson: payload.photosJson ?? null,
      },
    });

    await tx.hotelRoom.update({
      where: { id: payload.roomId! },
      data: { status: "manutenzione", hkPmsCode: "MAINTENANCE" },
    });

    await writeHkAudit(
      {
        tenantId,
        roomId: payload.roomId,
        action: "maintenance_created",
        newValue: payload.title,
        actor,
      },
      tx,
    );

    return row;
  });

  emitHousekeepingEvent(tenantId, { reason: "maintenance_created", roomId: payload.roomId });
  return ok({ ticket });
}
