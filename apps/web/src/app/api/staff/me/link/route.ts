import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const LINK_ROLES = ["supervisor", "owner", "super_admin"] as const;

/** POST /api/staff/me/link — collega un userId a un StaffMember (solo manager) */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...LINK_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const data = await body<{ staffId: string; userId: string }>(req);
  if (!data.staffId || !data.userId) return err("staffId e userId obbligatori", 400);

  const member = await prisma.staffMember.findFirst({ where: { id: data.staffId, tenantId }, select: { id: true } });
  if (!member) return err("Staff member non trovato", 404);

  const user = await prisma.user.findFirst({ where: { id: data.userId, tenantId }, select: { id: true } });
  if (!user) return err("Utente non trovato", 404);

  const updated = await prisma.staffMember.update({
    where: { id: data.staffId },
    data: { userId: data.userId },
    select: { id: true, userId: true, name: true, role: true },
  });

  return ok(updated);
}
