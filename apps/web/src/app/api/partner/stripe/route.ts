import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getPartnerStripeOverview } from "@/lib/db/repositories/partner.repository";
import { recordPartnerAudit } from "@/lib/observability/partner-audit";

const PARTNER_ROLES = ["partner", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, PARTNER_ROLES);
  if (guard.error) return guard.error;
  const { user } = guard;
  if (!user) return err("Unauthorized", 401);

  try {
    const data = await getPartnerStripeOverview();
    void recordPartnerAudit({
      action: "partner.stripe.view",
      actor: user,
      req,
    });
    return ok(data);
  } catch (error) {
    console.error("[partner/stripe GET]", error);
    return err("Impossibile caricare dati Stripe.", 500);
  }
}
