import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requirePartnerEnterpriseUser } from "@/lib/auth/guards";
import { getUserAccessReport } from "@/lib/db/repositories/user-access.repository";
import { recordPartnerAudit } from "@/lib/observability/partner-audit";

export async function GET(req: NextRequest) {
  const guard = await requirePartnerEnterpriseUser(req);
  if (guard.error) return guard.error;
  const { user } = guard;
  if (!user) return err("Unauthorized", 401);

  try {
    const report = await getUserAccessReport();
    void recordPartnerAudit({
      action: "partner.user_access.view",
      actor: user,
      req,
      metadata: { total: report.summary.total, neverLoggedIn: report.summary.neverLoggedIn },
    });
    return ok(report);
  } catch (error) {
    console.error("[partner/user-access GET]", error);
    return err("Impossibile caricare il report accessi utenti.", 500);
  }
}
