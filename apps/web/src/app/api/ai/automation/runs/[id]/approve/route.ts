import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { automationAudit } from "@/lib/ai/automation/audit";
import { workflowRunner } from "@/lib/ai/automation/workflow-runner";

const APPROVE_ROLES = ["owner", "supervisor", "super_admin"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiUser(req, APPROVE_ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const { id } = await params;
  const payload = await body<{ notes?: string }>(req);

  const run = await automationAudit.getRun(id, tenantId);
  if (!run) return err("Run not found", 404);
  if (run.status !== "awaiting_approval") return err("Run non in attesa di approvazione", 409);

  const updated = await workflowRunner.executeApproved({
    tenantId,
    run,
    reviewerId: guard.user.id,
  });

  return ok({ run: updated });
}
