import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import {
  actorFromRequest,
  createHousekeepingTask,
  inspectTask,
  updateTaskStatus,
} from "@/lib/hotel/housekeeping-service";
import type { HousekeepingPriority, HousekeepingTaskType } from "@prisma/client";

const ROLES = ["hotel_manager", "reception", "housekeeping", "supervisor", "owner", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{
    action?: "start" | "complete" | "assign" | "inspect";
    status?: "todo" | "in_progress" | "done";
    assignedToUserId?: string;
    actualMin?: number;
    notes?: string;
    checklistJson?: string;
    photosJson?: string;
    signatureData?: string;
    inspectionLevel?: number;
    approved?: boolean;
    comments?: string;
  }>(req);

  const actor = actorFromRequest(guard.user, req.headers);

  if (payload.action === "inspect" || payload.inspectionLevel != null) {
    const level = payload.inspectionLevel ?? 1;
    const inspection = await inspectTask(tenantId, id, level, {
      approved: payload.approved ?? true,
      signatureData: payload.signatureData,
      photosJson: payload.photosJson,
      comments: payload.comments,
      supervisorId: guard.user.role === "supervisor" || guard.user.role === "hotel_manager" ? guard.user.id : undefined,
      actor,
    });
    return ok({ inspection });
  }

  if (payload.assignedToUserId) {
    const updated = await prisma.housekeepingTask.update({
      where: { id },
      data: { assignedToUserId: payload.assignedToUserId },
    });
    return ok({ task: updated });
  }

  const status =
    payload.status ??
    (payload.action === "start" ? "in_progress" : payload.action === "complete" ? "done" : undefined);

  if (!status) return err("status or action required");

  const task = await updateTaskStatus(tenantId, id, status, actor, {
    actualMin: payload.actualMin,
    notes: payload.notes,
    checklistJson: payload.checklistJson,
    photosJson: payload.photosJson,
    signatureData: payload.signatureData,
  });

  return ok({ task });
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();

  const task = await prisma.housekeepingTask.findFirst({
    where: { id, tenantId },
    include: {
      room: { select: { code: true, floor: true, roomType: true } },
      inspections: { orderBy: { level: "asc" } },
    },
  });
  if (!task) return err("Task not found", 404);
  return ok({ task });
}
