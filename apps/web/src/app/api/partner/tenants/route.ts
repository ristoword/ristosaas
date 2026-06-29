import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requirePartnerEnterpriseUser } from "@/lib/auth/guards";
import { getPartnerTenantsOverview } from "@/lib/db/repositories/partner.repository";
import { recordPartnerAudit } from "@/lib/observability/partner-audit";

export async function GET(req: NextRequest) {
  const guard = await requirePartnerEnterpriseUser(req);
  if (guard.error) return guard.error;
  const { user } = guard;
  if (!user) return err("Unauthorized", 401);

  try {
    const tenants = await getPartnerTenantsOverview();
    void recordPartnerAudit({
      action: "partner.tenants.view",
      actor: user,
      req,
      metadata: { count: tenants.length },
    });
    return ok({ tenants });
  } catch (error) {
    console.error("[partner/tenants GET]", error);
    return err("Impossibile caricare i tenant.", 500);
  }
}
