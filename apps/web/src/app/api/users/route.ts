import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const ROLES = ["supervisor", "owner", "super_admin"] as const;

/** GET /api/users — lista utenti del tenant corrente (per collegamento staff) */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();

  const users = await prisma.user.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, username: true, role: true, email: true },
  });

  return ok(users);
}
