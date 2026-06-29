import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { buildHousekeepingDashboard } from "@/lib/hotel/housekeeping-service";
import { analyzeHousekeepingOps } from "@/lib/hotel/housekeeping-ai-service";

const ROLES = ["hotel_manager", "reception", "housekeeping", "supervisor", "owner", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();

  const dashboard = await buildHousekeepingDashboard(tenantId);
  const ai = analyzeHousekeepingOps({ kpi: dashboard.kpi, roomBoard: dashboard.roomBoard });

  return ok({ ...dashboard, ai });
}
