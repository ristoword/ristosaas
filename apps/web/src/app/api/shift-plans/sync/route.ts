import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const SYNC_ROLES = ["supervisor", "owner", "super_admin"] as const;

type SyncResult = {
  updated: Array<{ staffId: string; staffName: string; newStatus: string }>;
  summary: { totalShifts: number; totalStaff: number };
};

/**
 * POST /api/shift-plans/sync
 * Analizza i turni pianificati nel range dato e aggiorna lo StaffMember.status
 * in base al tipo di turno prevalente del giorno corrente.
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...SYNC_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const data = await body<{ from: string; to: string }>(req);

  if (!data.from || !data.to) return err("from e to sono obbligatori (YYYY-MM-DD)", 400);

  const today = new Date().toISOString().slice(0, 10);

  const plans = await prisma.shiftPlan.findMany({
    where: { tenantId, day: { gte: data.from, lte: data.to } },
    select: { staffId: true, staffName: true, shiftType: true, day: true },
  });

  const todayPlans = plans.filter((p) => p.day === today && p.staffId);

  const staffStatusMap = new Map<string, { staffName: string; shiftType: string }>();
  for (const p of todayPlans) {
    if (!p.staffId) continue;
    const existing = staffStatusMap.get(p.staffId);
    // Priority: malattia > ferie > permesso > riposo > lavoro
    const priority = ["malattia", "ferie", "permesso", "riposo", "lavoro"];
    if (!existing || priority.indexOf(p.shiftType) < priority.indexOf(existing.shiftType)) {
      staffStatusMap.set(p.staffId, { staffName: p.staffName, shiftType: p.shiftType });
    }
  }

  const shiftTypeToStatus: Record<string, string> = {
    lavoro: "attivo",
    ferie: "ferie",
    malattia: "malattia",
    permesso: "ferie",
    riposo: "attivo",
  };

  const updated: SyncResult["updated"] = [];
  for (const [staffId, { staffName, shiftType }] of staffStatusMap.entries()) {
    const newStatus = shiftTypeToStatus[shiftType] ?? "attivo";
    await prisma.staffMember.updateMany({
      where: { id: staffId, tenantId },
      data: { status: newStatus as "attivo" | "ferie" | "malattia" | "licenziato" },
    });
    updated.push({ staffId, staffName, newStatus });
  }

  if (updated.length > 0) {
    await prisma.notification.create({
      data: {
        tenantId,
        userId: null,
        type: "sync_staff",
        title: "Turni sincronizzati",
        message: `${updated.length} dipendent${updated.length === 1 ? "e aggiornato" : "i aggiornati"} in base ai turni di oggi.`,
        href: "/turni",
      },
    });
  }

  return ok({
    updated,
    summary: {
      totalShifts: plans.length,
      totalStaff: staffStatusMap.size,
    },
  });
}
