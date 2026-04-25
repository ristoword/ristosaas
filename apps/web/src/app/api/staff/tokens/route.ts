import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { createStaffToken } from "@/lib/security/staff-token";

const TOKEN_ROLES = ["supervisor", "owner", "super_admin", "sala", "cucina", "bar", "pizzeria", "cassa", "hotel_manager", "reception"] as const;

/** POST /api/staff/tokens — genera token badge per un gruppo di staff member */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...TOKEN_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const payload = await body<{ staffIds?: unknown }>(req);
  const raw = Array.isArray(payload?.staffIds) ? payload.staffIds : [];
  const staffIds = raw.filter((x): x is string => typeof x === "string" && x.length > 0).slice(0, 500);

  if (staffIds.length === 0) return err("staffIds required", 400);

  const owned = await prisma.staffMember.findMany({
    where: { tenantId, id: { in: staffIds } },
    select: { id: true, name: true, role: true },
  });

  const tokens = owned.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    token: createStaffToken({ tenantId, staffId: s.id }),
  }));

  return ok({ tokens });
}
