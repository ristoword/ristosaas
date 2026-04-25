import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const SHIFT_ROLES = ["cucina", "pizzeria", "bar", "sala", "supervisor", "owner", "super_admin"] as const;

/** GET /api/shift-plans?area=cucina */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...SHIFT_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const area = req.nextUrl.searchParams.get("area") || "cucina";

  const rows = await prisma.shiftPlan.findMany({
    where: { tenantId, area },
    orderBy: [{ day: "asc" }, { createdAt: "asc" }],
    select: { id: true, area: true, day: true, staffName: true, hours: true, role: true, createdAt: true },
  });

  return ok(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
}

/** POST /api/shift-plans */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...SHIFT_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const data = await body<{ area?: string; day: string; staffName: string; hours?: string; role?: string }>(req);

  if (!data.staffName?.trim()) return err("staffName è obbligatorio", 400);

  const row = await prisma.shiftPlan.create({
    data: {
      tenantId,
      area: data.area?.trim() || "cucina",
      day: data.day?.trim() || "",
      staffName: data.staffName.trim(),
      hours: data.hours?.trim() || "",
      role: data.role?.trim() || "",
    },
    select: { id: true, area: true, day: true, staffName: true, hours: true, role: true, createdAt: true },
  });

  return ok({ ...row, createdAt: row.createdAt.toISOString() }, 201);
}
