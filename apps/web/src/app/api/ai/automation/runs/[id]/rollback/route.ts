import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { automationActionExecutor } from "@/lib/ai/automation/action-executor";
import { automationAudit } from "@/lib/ai/automation/audit";

const ROLLBACK_ROLES = ["owner", "supervisor", "super_admin"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiUser(req, ROLLBACK_ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const { id } = await params;

  const run = await automationAudit.getRun(id, tenantId);
  if (!run) return err("Run not found", 404);
  if (run.status !== "completed" && run.status !== "failed") {
    return err("Rollback disponibile solo su run completati o falliti", 409);
  }

  const updated = await automationActionExecutor.rollbackRun({ tenantId, run });
  return ok({ run: updated });
}
