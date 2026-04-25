import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const ALL_ROLES = [
  "sala", "cucina", "bar", "pizzeria", "cassa", "magazzino",
  "staff", "supervisor", "owner", "super_admin",
  "hotel_manager", "reception", "housekeeping",
] as const;

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/notifications/:id/read */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...ALL_ROLES]);
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const tenantId = getTenantId();

  const existing = await prisma.notification.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) return err("Notifica non trovata", 404);

  await prisma.notification.update({ where: { id }, data: { read: true } });
  return ok({ read: true });
}
