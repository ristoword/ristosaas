import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { runOrchestrator, runOrchestratorStream } from "@/lib/ai/orchestrator";
import type { OrchestratorRequest } from "@/lib/ai/orchestrator/types";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { isAiFeatureEnabled, isMultiAgentAvailable } from "@/lib/ai/platform-config.runtime";

const ORCHESTRATOR_ROLES = [
  "sala",
  "cucina",
  "bar",
  "pizzeria",
  "cassa",
  "magazzino",
  "staff",
  "supervisor",
  "owner",
  "super_admin",
  "hotel_manager",
  "reception",
  "housekeeping",
] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ORCHESTRATOR_ROLES);
  if (guard.error) return guard.error;

  if (!(await isAiFeatureEnabled("master"))) {
    return err("Infrastruttura AI disattivata dalla piattaforma", 503);
  }
  if (isMultiAgentAvailable() && !(await isAiFeatureEnabled("multiAgent"))) {
    return err("Multi Agent disattivato dalla piattaforma", 503);
  }

  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<OrchestratorRequest>(req);

  if (!payload.query?.trim()) {
    return err("query is required", 400);
  }

  if (payload.stream) {
    return runOrchestratorStream(
      {
        tenantId,
        userId: guard.user.id,
        request: payload,
        signal: req.signal,
      },
      req.signal,
    );
  }

  const result = await runOrchestrator({
    tenantId,
    userId: guard.user.id,
    request: payload,
    signal: req.signal,
  });

  return ok(result);
}
