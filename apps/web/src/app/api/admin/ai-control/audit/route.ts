import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requirePartnerEnterpriseUser } from "@/lib/auth/guards";
import { aiControlAuditRepository } from "@/lib/db/repositories/ai-control.repository";

export async function GET(req: NextRequest) {
  const guard = await requirePartnerEnterpriseUser(req);
  if (guard.error) return guard.error;

  const url = new URL(req.url);
  const tenantId = guard.user!.role === "super_admin" ? url.searchParams.get("tenantId") ?? undefined : guard.user!.tenantId;
  const rows = await aiControlAuditRepository.list({ tenantId, limit: 150 });
  return ok({ items: rows });
}
