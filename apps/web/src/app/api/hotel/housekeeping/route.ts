import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { HousekeepingTask } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "housekeeping", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const rows = await prisma.housekeepingTask.findMany({
    where: { tenantId: getTenantId() },
    orderBy: [{ scheduledFor: "asc" }, { id: "asc" }],
    select: {
      id: true,
      roomId: true,
      status: true,
      scheduledFor: true,
    },
  });

  const tasks: HousekeepingTask[] = rows.map((item) => ({
    id: item.id,
    roomId: item.roomId,
    assignedTo: "Housekeeping",
    status: item.status === "in_progress" ? "in_progress" : item.status === "done" ? "done" : "todo",
    scheduledFor: item.scheduledFor.toISOString().slice(0, 10),
    inspected: false,
  }));

  return ok(tasks);
}
