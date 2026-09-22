import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { adminRepository } from "@/lib/db/repositories/admin.repository";
import { recordAdminAudit } from "@/lib/observability/admin-audit";
import { parseStaffCostCountry, staffCostCountryFromTenant } from "@/lib/staff/staff-cost-country";

const ADMIN_ROLES = ["super_admin"] as const;

type Ctx = { params: Promise<{ tenantId: string }> };

function mapAdminTenant(row: {
  id: string;
  name: string;
  country: string;
  plan: string;
  accessStatus: string;
  createdAt: Date;
  users: { id: string }[];
}) {
  return {
    id: row.id,
    name: row.name,
    country: staffCostCountryFromTenant(row),
    plan: row.plan,
    users: row.users.length,
    created: row.createdAt.toISOString().slice(0, 10),
    status: row.accessStatus === "blocked" ? "blocked" : "active",
  };
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;
  const { tenantId } = await ctx.params;
  if (!tenantId?.trim()) return err("tenantId required");

  const payload = await body<{ status?: string; country?: unknown }>(req);
  const wantsStatus = payload?.status != null;
  const wantsCountry = payload?.country != null;
  if (!wantsStatus && !wantsCountry) return err("status or country required");

  if (wantsStatus && payload.status !== "active" && payload.status !== "blocked") {
    return err("status must be active or blocked");
  }
  const country = wantsCountry ? parseStaffCostCountry(payload.country) : null;
  if (wantsCountry && !country) return err("country must be IT or NL");

  try {
    let row = wantsStatus
      ? await adminRepository.setTenantAccessStatus(tenantId, payload.status as "active" | "blocked")
      : await adminRepository.findTenantAdminRow(tenantId);

    if (country) {
      row = await adminRepository.setTenantCountry(tenantId, country);
    }

    if (wantsStatus) {
      void recordAdminAudit({
        action: payload.status === "blocked" ? "tenant.access.block" : "tenant.access.unblock",
        actor: guard.user,
        tenantId,
        metadata: { previousStatus: row.accessStatus, requestedStatus: payload.status },
        req,
      });
    }
    if (country) {
      void recordAdminAudit({
        action: "tenant.country.update",
        actor: guard.user,
        tenantId,
        metadata: { country },
        req,
      });
    }

    return ok(mapAdminTenant(row));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("tenant_not_found")) return err("Tenant not found", 404);
    return err("Unable to update tenant", 500);
  }
}
