import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { buildHousekeepingDashboard } from "@/lib/hotel/housekeeping-service";

const ROLES = ["hotel_manager", "supervisor", "owner", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const days = Number(req.nextUrl.searchParams.get("days") ?? 7);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const [dashboard, completedTasks, auditCount, byOperator] = await Promise.all([
    buildHousekeepingDashboard(tenantId),
    prisma.housekeepingTask.findMany({
      where: { tenantId, status: "done", completedAt: { gte: since } },
      select: { actualMin: true, assignedToUserId: true, roomId: true },
    }),
    prisma.housekeepingAuditLog.count({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.housekeepingTask.groupBy({
      by: ["assignedToUserId"],
      where: { tenantId, status: "done", completedAt: { gte: since } },
      _count: true,
      _avg: { actualMin: true },
    }),
  ]);

  const avgMin =
    completedTasks.length > 0
      ? Math.round(completedTasks.reduce((s, t) => s + (t.actualMin ?? 0), 0) / completedTasks.length)
      : 0;

  const delays = completedTasks.filter((t) => (t.actualMin ?? 0) > 45).length;

  return ok({
    periodDays: days,
    kpi: dashboard.kpi,
    productivity: {
      avgCleanMin: avgMin,
      tasksCompleted: completedTasks.length,
      delays,
      qualityScore: dashboard.kpi.readyPct,
      auditEvents: auditCount,
    },
    byOperator: byOperator.map((o) => ({
      operatorId: o.assignedToUserId,
      tasksDone: o._count,
      avgMin: Math.round(o._avg.actualMin ?? 0),
    })),
    generatedAt: new Date().toISOString(),
  });
}
