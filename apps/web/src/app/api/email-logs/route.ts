import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const ROLES = ["owner", "super_admin"] as const;

/** GET /api/email-logs?limit=50 */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "50"), 200);

  const rows = await prisma.emailLog.findMany({
    where: { tenantId },
    orderBy: { sentAt: "desc" },
    take: limit,
    select: { id: true, toEmail: true, subject: true, templateSlug: true, status: true, errorMessage: true, sentAt: true },
  });

  return ok(rows.map((r) => ({ ...r, sentAt: r.sentAt.toISOString() })));
}
