import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { HousekeepingTask } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "housekeeping", "owner", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();

  const rows = await prisma.housekeepingTask.findMany({
    where: { tenantId },
    orderBy: [{ scheduledFor: "asc" }, { id: "asc" }],
    select: {
      id: true,
      roomId: true,
      status: true,
      scheduledFor: true,
      assignedToUserId: true,
    },
  });

  const staffIds = rows.map((r) => r.assignedToUserId).filter(Boolean) as string[];
  const staffMembers = staffIds.length > 0
    ? await prisma.staffMember.findMany({
        where: { tenantId, id: { in: staffIds } },
        select: { id: true, name: true },
      })
    : [];
  const staffMap = new Map(staffMembers.map((s) => [s.id, s.name]));

  const tasks: HousekeepingTask[] = rows.map((item) => ({
    id: item.id,
    roomId: item.roomId,
    assignedTo: item.assignedToUserId
      ? (staffMap.get(item.assignedToUserId) ?? item.assignedToUserId)
      : "Non assegnato",
    status: item.status === "in_progress" ? "in_progress" : item.status === "done" ? "done" : "todo",
    scheduledFor: item.scheduledFor.toISOString().slice(0, 10),
    inspected: false,
  }));

  return ok(tasks);
}
