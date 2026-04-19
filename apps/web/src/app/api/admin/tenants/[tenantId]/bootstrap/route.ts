import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { adminRepository } from "@/lib/db/repositories/admin.repository";

const ADMIN_ROLES = ["super_admin"] as const;

export async function POST(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;

  const { tenantId } = await context.params;
  if (!tenantId || tenantId.trim().length === 0) return err("tenantId required");

  try {
    const result = await adminRepository.bootstrapTenantOperationalData(tenantId);
    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to bootstrap tenant";
    if (message === "tenant_not_found") return err("Tenant not found", 404);
    return err("Unable to bootstrap tenant", 500);
  }
}
