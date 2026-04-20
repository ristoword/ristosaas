import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { adminRepository } from "@/lib/db/repositories/admin.repository";
import { recordAdminAudit } from "@/lib/observability/admin-audit";

const ADMIN_ROLES = ["super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const { status } = await body<{ status: "trial" | "active" | "expired" | "suspended" }>(req);
  if (!status) return err("status is required");
  const row = await adminRepository.setLicenseStatus(id, status);
  void recordAdminAudit({
    action: "tenant.license.update",
    actor: guard.user,
    targetId: id,
    metadata: { newStatus: status },
    req,
  });
  return ok(row);
}
