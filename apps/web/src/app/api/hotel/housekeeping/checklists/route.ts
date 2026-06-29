import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { ensureDefaultChecklists } from "@/lib/hotel/housekeeping-service";

const ROLES = ["hotel_manager", "reception", "housekeeping", "supervisor", "owner", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();

  await ensureDefaultChecklists(tenantId);
  const templates = await prisma.housekeepingChecklistTemplate.findMany({
    where: { tenantId, active: true },
    orderBy: [{ roomType: "asc" }, { taskType: "asc" }],
  });

  return ok({
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      roomType: t.roomType,
      taskType: t.taskType,
      items: JSON.parse(t.itemsJson) as Array<{ id: string; label: string; done: boolean }>,
    })),
  });
}
