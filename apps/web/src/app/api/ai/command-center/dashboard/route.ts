import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { buildCommandCenterDashboard } from "@/lib/ai/command-center/dashboard-service";
import type { CommandCenterFilters } from "@/lib/ai/command-center/types";

const ROLES = ["owner", "supervisor", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();

  const sp = req.nextUrl.searchParams;
  const filters: CommandCenterFilters = {
    module: sp.get("module")?.trim() || undefined,
    userId: sp.get("userId")?.trim() || undefined,
    workflowId: sp.get("workflowId")?.trim() || undefined,
    automationModule: sp.get("automationModule")?.trim() || undefined,
    periodDays: Number(sp.get("periodDays") || "30"),
  };

  const dashboard = await buildCommandCenterDashboard(tenantId, filters);
  return ok(dashboard);
}
