import { NextRequest } from "next/server";
import { ok, err, body, fireAndForget } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { SHIFT_ROLES } from "@/lib/auth/roles";

const SELECT = {
  id: true, area: true, day: true, staffName: true, staffId: true,
  startTime: true, endTime: true, hours: true, role: true,
  shiftType: true, notes: true, leaveApproval: true, createdAt: true, updatedAt: true,
} as const;

function serialize(r: { createdAt: Date; updatedAt: Date; [k: string]: unknown }) {
  return { ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
}

/** GET /api/shift-plans?area=cucina&from=2024-01-01&to=2024-01-31&staffId=xxx */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...SHIFT_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  if (!tenantId) return err("Tenant non trovato", 401);

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
  if (!tenantId) {
    console.error("❌ getTenantId() returned null");
    return err("Tenant non trovato. Per favore, effettua il login di nuovo.", 401);
  }

  console.log("📝 POST /api/shift-plans - tenantId:", tenantId);

  let data;
  try {
    data = await body<{
      area?: string; day: string; staffName: string; staffId?: string;
      startTime?: string; endTime?: string; hours?: string; role?: string;
      shiftType?: string; notes?: string; assignedRooms?: string[];
    }>(req);
    console.log("📦 Request body:", data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error parsing request body:", message);
    return err(`Errore nella lettura dei dati: ${message}`, 400);
  }

  if (!data.staffName?.trim()) return err("staffName è obbligatorio", 400);
  if (!data.day?.trim()) return err("day è obbligatorio", 400);

  const assignedRooms = Array.isArray(data.assignedRooms) ? data.assignedRooms : null;

  try {
    const row = await prisma.shiftPlan.create({
      data: {
        tenantId,
        area: data.area?.trim() || "cucina",
        day: data.day.trim(),
        staffName: data.staffName.trim(),
        staffId: data.staffId?.trim() || null,
        startTime: data.startTime?.trim() || "",
        endTime: data.endTime?.trim() || "",
        hours: data.hours?.trim() || "",
        role: data.role?.trim() || "",
        shiftType: data.shiftType?.trim() || "lavoro",
        notes: data.notes?.trim() || "",
        assignedRooms: assignedRooms ?? undefined,
      },
      select: SELECT,
    });

    console.log("✅ ShiftPlan created:", { id: row.id, staffName: row.staffName, area: row.area });

    // Crea housekeeping tasks se necessario
    if (assignedRooms && assignedRooms.length > 0 && data.area?.trim().toLowerCase() === "housekeeping") {
      const scheduledFor = new Date(row.day + "T08:00:00");
      const assignedToUserId = data.staffId?.trim() || data.staffName.trim();

      console.log("🏨 Creating housekeeping tasks:", { 
        tenantId, 
        assignedRooms, 
        assignedToUserId, 
        scheduledFor 
      });

      fireAndForget(
        prisma.housekeepingTask.createMany({
          data: assignedRooms.map((roomId) => ({
            tenantId,
            roomId,
            assignedToUserId,
            status: "todo",
            scheduledFor,
          })),
          skipDuplicates: true,
        }),
        "housekeeping:assign-rooms-from-shift",
      );
    }

    // Crea notifica
    fireAndForget(
      prisma.notification.create({
        data: {
          tenantId,
          type: "turno_creato",
          title: "Nuovo turno pianificato",
          message: `${row.staffName} — ${row.area} — ${row.day}`,
          href: "/turni",
        },
      }),
      "notification:shift-plan-created",
    );

    return ok(serialize(row), 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error creating shift plan:", message);
    console.error("❌ Full error:", error);
    return err(`Errore nella creazione del turno: ${message}`, 500);
  }
}
