import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const SHIFT_ROLES = ["cucina", "pizzeria", "bar", "sala", "supervisor", "owner", "super_admin"] as const;

const SELECT = {
  id: true, area: true, day: true, staffName: true, staffId: true,
  startTime: true, endTime: true, hours: true, role: true,
  shiftType: true, notes: true, createdAt: true, updatedAt: true,
} as const;

function serialize(r: { createdAt: Date; updatedAt: Date; [k: string]: unknown }) {
  return { ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
}

/** GET /api/shift-plans?area=cucina&from=2024-01-01&to=2024-01-31&staffId=xxx */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...SHIFT_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const p = req.nextUrl.searchParams;
  const area = p.get("area") || undefined;
  const from = p.get("from") || undefined;
  const to = p.get("to") || undefined;
  const staffId = p.get("staffId") || undefined;

  const where: Record<string, unknown> = { tenantId };
  if (area) where.area = area;
  if (staffId) where.staffId = staffId;
  if (from || to) {
    const dayFilter: Record<string, string> = {};
    if (from) dayFilter.gte = from;
    if (to) dayFilter.lte = to;
    where.day = dayFilter;
  }

  const rows = await prisma.shiftPlan.findMany({
    where,
    orderBy: [{ day: "asc" }, { createdAt: "asc" }],
    select: SELECT,
  });

  return ok(rows.map(serialize));
}

/** POST /api/shift-plans */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...SHIFT_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const data = await body<{
    area?: string; day: string; staffName: string; staffId?: string;
    startTime?: string; endTime?: string; hours?: string; role?: string;
    shiftType?: string; notes?: string;
  }>(req);

  if (!data.staffName?.trim()) return err("staffName è obbligatorio", 400);

  const row = await prisma.shiftPlan.create({
    data: {
      tenantId,
      area: data.area?.trim() || "cucina",
      day: data.day?.trim() || "",
      staffName: data.staffName.trim(),
      staffId: data.staffId?.trim() || null,
      startTime: data.startTime?.trim() || "",
      endTime: data.endTime?.trim() || "",
      hours: data.hours?.trim() || "",
      role: data.role?.trim() || "",
      shiftType: data.shiftType?.trim() || "lavoro",
      notes: data.notes?.trim() || "",
    },
    select: SELECT,
  });

  void prisma.notification.create({
    data: {
      tenantId,
      type: "turno_creato",
      title: "Nuovo turno pianificato",
      message: `${row.staffName} — ${row.area} — ${row.day}`,
      href: "/turni",
    },
  }).catch(() => {});

  return ok(serialize(row), 201);
}
