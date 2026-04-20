import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { prisma } from "@/lib/db/prisma";
import { billingRepository } from "@/lib/db/repositories/billing.repository";
import { sendOperationalAlert } from "@/lib/observability/alerts";
import { verifyInternalSignature } from "@/lib/security/internal-signature";

/**
 * Cron job: re-reads every tenant's latest subscription from DB and reapplies
 * the entitlement mapping (plan -> features -> license state). Safe to run
 * repeatedly: all writes are idempotent.
 *
 * Trigger with GitHub Actions (or any scheduler) using the same HMAC signing
 * as `/api/ai/proposals/schedule/daily`:
 *   headers:
 *     x-scheduler-ts: <now in ms>
 *     x-scheduler-signature: HMAC_SHA256(AI_SCHEDULER_TOKEN,
 *       `${ts}.POST./api/jobs/billing/reconcile-all.`)
 */
export async function POST(req: NextRequest) {
  const sharedSecret = process.env.AI_SCHEDULER_TOKEN?.trim();
  if (!sharedSecret) return err("AI_SCHEDULER_TOKEN non configurato", 500);

  const signature = req.headers.get("x-scheduler-signature") || "";
  const timestampMs = Number(req.headers.get("x-scheduler-ts") || "");
  const isValid = verifyInternalSignature({
    secret: sharedSecret,
    timestampMs,
    providedSignature: signature,
    method: req.method,
    pathname: req.nextUrl.pathname,
  });
  if (!isValid) return err("Forbidden", 403);

  const tenants = await prisma.tenant.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  let reconciled = 0;
  let skipped = 0;
  const failures: Array<{ tenantId: string; reason: string }> = [];

  for (const tenant of tenants) {
    try {
      const res = await billingRepository.reconcileTenantFromLatestSubscription(tenant.id);
      if (res.reconciled) reconciled += 1;
      else {
        skipped += 1;
        const reason = (res as { reason?: string }).reason;
        if (reason) failures.push({ tenantId: tenant.id, reason: String(reason) });
      }
    } catch (error) {
      failures.push({ tenantId: tenant.id, reason: error instanceof Error ? error.message : "unknown" });
    }
  }

  if (failures.length > 0) {
    await sendOperationalAlert({
      key: "billing_reconcile_all_failures",
      title: `Reconcile billing: ${failures.length} tenant con problemi`,
      message: failures.map((f) => `- ${f.tenantId}: ${f.reason}`).join("\n"),
      severity: "warning",
      metadata: { reconciled, skipped, failures: failures.length },
    });
  }

  return ok({ tenants: tenants.length, reconciled, skipped, failures: failures.length });
}
