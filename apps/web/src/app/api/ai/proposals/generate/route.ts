import { NextRequest } from "next/server";
import { body, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { aiKitchenRepository } from "@/lib/db/repositories/ai-kitchen.repository";
import { aiProposalsRepository } from "@/lib/db/repositories/ai-proposals.repository";
import { sendOperationalAlert } from "@/lib/observability/alerts";

const ALLOWED_ROLES = ["owner", "supervisor", "cucina", "magazzino", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ALLOWED_ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{ days?: number; status?: "draft" | "pending_review" }>(req);
  const periodDaysRaw = Number(payload.days || 14);
  const periodDays = Number.isFinite(periodDaysRaw)
    ? Math.min(60, Math.max(1, Math.floor(periodDaysRaw)))
    : 14;
  const snapshot = await aiKitchenRepository.operationalSnapshot(tenantId, periodDays);
  const drafts = aiKitchenRepository.buildProposalDrafts(snapshot);
  const proposals = await aiProposalsRepository.createBatch({
    tenantId,
    createdBy: guard.user.id,
    drafts,
    status: payload.status || "pending_review",
  });

  await sendOperationalAlert({
    key: `ai-proposals-pending-${tenantId}`,
    title: "Nuove proposte AI operative",
    message: `Generate ${proposals.length} proposte in stato ${payload.status || "pending_review"} per tenant ${tenantId}.`,
    severity: "warning",
    metadata: {
      tenantId,
      proposals: proposals.length,
      periodDays,
      generatedBy: guard.user.id,
    },
  });

  return ok({
    snapshot,
    proposals,
    generated: proposals.length,
  });
}
