import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";

const ROLES = ["hotel_manager", "supervisor", "owner", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 100);

  const logs = await prisma.housekeepingAuditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 500),
  });

  return ok({ logs });
}
