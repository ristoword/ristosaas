import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const ALL_ROLES = [
  "sala", "cucina", "bar", "pizzeria", "cassa", "magazzino",
  "staff", "supervisor", "owner", "super_admin",
  "hotel_manager", "reception", "housekeeping",
] as const;

/** PATCH /api/notifications/read-all — mark all notifications as read for current user */
export async function PATCH(req: NextRequest) {
  const guard = await requireApiUser(req, [...ALL_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const userId = guard.user.id;

  const { count } = await prisma.notification.updateMany({
    where: { tenantId, OR: [{ userId }, { userId: null }], read: false },
    data: { read: true },
  });

  return ok({ marked: count });
}
