import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { automationAudit } from "@/lib/ai/automation/audit";

const RUN_ROLES = ["owner", "supervisor", "super_admin", "magazzino", "cucina", "hotel_manager"] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiUser(req, RUN_ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const { id } = await params;

  const run = await automationAudit.getRun(id, tenantId);
  if (!run) return err("Run not found", 404);
  const auditLog = await automationAudit.listAuditLog(id, tenantId);
  return ok({ run, auditLog });
}
