import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requirePartnerEnterpriseUser } from "@/lib/auth/guards";
import { recordPartnerAudit, type PartnerAuditAction } from "@/lib/observability/partner-audit";

export async function POST(req: NextRequest) {
  const guard = await requirePartnerEnterpriseUser(req);
  if (guard.error) return guard.error;
  const { user } = guard;
  if (!user) return err("Unauthorized", 401);

  try {
    const body = (await req.json()) as { action?: PartnerAuditAction; metadata?: Record<string, unknown> };
    if (!body.action?.startsWith("partner.")) {
      return err("Azione audit non valida.", 400);
    }
    await recordPartnerAudit({
      action: body.action,
      actor: user,
      req,
      metadata: body.metadata,
    });
    return ok({ recorded: true });
  } catch (error) {
    console.error("[partner/audit POST]", error);
    return err("Audit non registrato.", 500);
  }
}
