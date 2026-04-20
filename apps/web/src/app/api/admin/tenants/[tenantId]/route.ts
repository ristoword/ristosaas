import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { adminRepository } from "@/lib/db/repositories/admin.repository";
import { recordAdminAudit } from "@/lib/observability/admin-audit";

const ADMIN_ROLES = ["super_admin"] as const;

type Ctx = { params: Promise<{ tenantId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;
  const { tenantId } = await ctx.params;
  if (!tenantId?.trim()) return err("tenantId required");

  const payload = await body<{ status?: string }>(req);
  const status = payload?.status;
  if (status !== "active" && status !== "blocked") return err("status must be active or blocked");

  try {
    const row = await adminRepository.setTenantAccessStatus(tenantId, status);
    void recordAdminAudit({
      action: status === "blocked" ? "tenant.access.block" : "tenant.access.unblock",
      actor: guard.user,
      tenantId,
      metadata: { previousStatus: row.accessStatus, requestedStatus: status },
      req,
    });
    return ok({
      id: row.id,
      name: row.name,
      plan: row.plan,
      users: row.users.length,
      created: row.createdAt.toISOString().slice(0, 10),
      status: row.accessStatus === "blocked" ? "blocked" : "active",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("tenant_not_found")) return err("Tenant not found", 404);
    return err("Unable to update tenant", 500);
  }
}
