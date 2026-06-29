import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requirePartnerEnterpriseUser } from "@/lib/auth/guards";
import { getPartnerDashboardMetrics } from "@/lib/db/repositories/partner.repository";
import { recordPartnerAudit } from "@/lib/observability/partner-audit";

export async function GET(req: NextRequest) {
  const guard = await requirePartnerEnterpriseUser(req);
  if (guard.error) return guard.error;
  const { user } = guard;
  if (!user) return err("Unauthorized", 401);

  try {
    const data = await getPartnerDashboardMetrics();
    void recordPartnerAudit({
      action: "partner.dashboard.view",
      actor: user,
      req,
    });
    return ok(data);
  } catch (error) {
    console.error("[partner/dashboard GET]", error);
    return err("Impossibile caricare la dashboard partner.", 500);
  }
}
