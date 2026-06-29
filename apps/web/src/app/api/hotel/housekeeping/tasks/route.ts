import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { actorFromRequest, createHousekeepingTask } from "@/lib/hotel/housekeeping-service";
import type { HousekeepingPriority, HousekeepingTaskType } from "@prisma/client";

const ROLES = ["hotel_manager", "reception", "housekeeping", "supervisor", "owner", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{
    roomId?: string;
    taskType?: HousekeepingTaskType;
    priority?: HousekeepingPriority;
    assignedToUserId?: string;
    scheduledFor?: string;
    guestName?: string;
    estimatedMin?: number;
  }>(req);

  if (!payload.roomId) return err("roomId required");

  const task = await createHousekeepingTask(tenantId, {
    roomId: payload.roomId,
    taskType: payload.taskType,
    priority: payload.priority,
    assignedToUserId: payload.assignedToUserId,
    scheduledFor: payload.scheduledFor ? new Date(payload.scheduledFor) : undefined,
    guestName: payload.guestName,
    estimatedMin: payload.estimatedMin,
    actor: actorFromRequest(guard.user, req.headers),
  });

  return ok({ task });
}
