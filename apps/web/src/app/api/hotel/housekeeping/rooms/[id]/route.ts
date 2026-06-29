import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { actorFromRequest, updateRoomPmsStatus } from "@/lib/hotel/housekeeping-service";
import type { HousekeepingPmsCode } from "@prisma/client";

const ROLES = ["hotel_manager", "reception", "housekeeping", "supervisor", "owner", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id: roomId } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{
    hkPmsCode?: HousekeepingPmsCode;
    doNotDisturb?: boolean;
    vipReady?: boolean;
    isBlocked?: boolean;
    hkPriority?: number;
    estimatedCleanMin?: number;
    hkNotes?: string;
  }>(req);

  const room = await updateRoomPmsStatus(tenantId, roomId, {
    ...payload,
    actor: actorFromRequest(guard.user, req.headers),
  });

  return ok({ room });
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id: roomId } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();

  const room = await prisma.hotelRoom.findFirst({
    where: { id: roomId, tenantId },
    include: {
      tasks: { where: { status: { not: "done" } }, take: 5, orderBy: { scheduledFor: "desc" } },
      maintenanceTickets: { where: { status: { notIn: ["closed", "resolved"] } }, take: 5 },
    },
  });
  if (!room) return err("Room not found", 404);
  return ok({ room });
}
