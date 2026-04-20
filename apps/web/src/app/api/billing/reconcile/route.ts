import { NextRequest, NextResponse } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { billingRepository } from "@/lib/db/repositories/billing.repository";
import { applyRateLimit, clientIpFromRequest, rateLimitHeaders } from "@/lib/security/rate-limit";

const BILLING_ROLES = ["owner", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, BILLING_ROLES);
  if (guard.error) return guard.error;

  const tenantIdForLimit = guard.user?.tenantId ?? "no-tenant";
  const rl = await applyRateLimit(`${clientIpFromRequest(req)}|${tenantIdForLimit}`, {
    bucket: "billing:reconcile",
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    const res = NextResponse.json(
      { error: `Troppe richieste reconcile. Riprova tra ${Math.ceil(rl.resetInMs / 1000)}s.` },
      { status: 429 },
    );
    for (const [k, v] of Object.entries(rateLimitHeaders(rl))) res.headers.set(k, v);
    return res;
  }

  return ok(await billingRepository.reconcileTenantFromLatestSubscription(getTenantId()));
}
