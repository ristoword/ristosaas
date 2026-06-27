import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { automationConfigStore } from "@/lib/ai/automation/config-store";
import type { AutomationModule, AutomationTriggerType } from "@/lib/ai/automation/types";

const CONFIG_ROLES = ["owner", "supervisor", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, CONFIG_ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const configs = await automationConfigStore.list(tenantId);
  return ok({ configs });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireApiUser(req, CONFIG_ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{
    module?: AutomationModule;
    role?: string | null;
    level?: 1 | 2 | 3;
    enabled?: boolean;
    triggers?: Partial<Record<AutomationTriggerType, boolean>>;
    conditions?: Record<string, unknown>;
  }>(req);

  if (!payload.module) return err("module is required", 400);

  const config = await automationConfigStore.upsert({
    tenantId,
    module: payload.module,
    role: payload.role,
    level: payload.level,
    enabled: payload.enabled,
    triggers: payload.triggers,
    conditions: payload.conditions,
  });

  return ok({ config });
}
