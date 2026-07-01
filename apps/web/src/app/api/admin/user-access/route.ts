import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getUserAccessReport } from "@/lib/db/repositories/user-access.repository";
import { recordAdminAudit } from "@/lib/observability/admin-audit";

const ADMIN_ROLES = ["super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;

  try {
    const report = await getUserAccessReport();
    void recordAdminAudit({
      action: "user_access.report.view",
      actor: guard.user,
      metadata: { total: report.summary.total, neverLoggedIn: report.summary.neverLoggedIn },
      req,
    });
    return ok(report);
  } catch (error) {
    console.error("[admin/user-access GET]", error);
    return err("Impossibile caricare il report accessi utenti.", 500);
  }
}
