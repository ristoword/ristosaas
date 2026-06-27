import { NextRequest } from "next/server";
import { body, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { automationEngine } from "@/lib/ai/automation/automation-engine";
import { automationAudit } from "@/lib/ai/automation/audit";
import type { AutomationModule, AutomationTriggerType } from "@/lib/ai/automation/types";

const RUN_ROLES = ["owner", "supervisor", "super_admin", "magazzino", "cucina", "hotel_manager"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, RUN_ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const limit = Number(req.nextUrl.searchParams.get("limit") || "50");
  const runs = await automationAudit.listRuns(tenantId, limit);
  return ok({ runs });
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, RUN_ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{
    triggerFilter?: AutomationTriggerType[];
    moduleFilter?: AutomationModule;
  }>(req);

  const result = await automationEngine.run({
    tenantId,
    triggeredBy: guard.user.id,
    userRole: guard.user.role,
    triggerFilter: payload.triggerFilter,
    moduleFilter: payload.moduleFilter,
    manual: true,
  });

  return ok(result);
}
