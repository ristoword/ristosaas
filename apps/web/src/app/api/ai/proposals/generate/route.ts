import { NextRequest } from "next/server";
import { body, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { generateAiDecisions } from "@/lib/ai/decisions/orchestrator";
import { decisionsToProposalDrafts } from "@/lib/ai/decisions/proposal-mapper";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { aiKitchenRepository } from "@/lib/db/repositories/ai-kitchen.repository";
import { aiProposalsRepository } from "@/lib/db/repositories/ai-proposals.repository";
import { sendOperationalAlert } from "@/lib/observability/alerts";

const ALLOWED_ROLES = ["owner", "supervisor", "cucina", "magazzino", "super_admin"] as const;

const KITCHEN_AI_DOMAINS = ["reorder", "inventory_depletion", "food_cost", "pricing", "supervisor_anomaly"] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ALLOWED_ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{ days?: number; status?: "draft" | "pending_review"; enrich?: boolean }>(req);
  const periodDaysRaw = Number(payload.days || 14);
  const periodDays = Number.isFinite(periodDaysRaw)
    ? Math.min(60, Math.max(1, Math.floor(periodDaysRaw)))
    : 14;

  const snapshot = await aiKitchenRepository.operationalSnapshot(tenantId, periodDays);
  const ruleDrafts = aiKitchenRepository.buildProposalDrafts(snapshot);
  const status = payload.status || "pending_review";

  if (payload.enrich) {
    const enriched = await generateAiDecisions(tenantId, guard.user.id, {
      domains: [...KITCHEN_AI_DOMAINS],
      periodDays,
      persist: false,
      enrich: true,
    });

    const aiDrafts = decisionsToProposalDrafts(enriched.decisions);
    const preservedRuleDrafts = ruleDrafts.filter((d) => d.type === "menu" || d.type === "hotel_bridge");
    const drafts = [...aiDrafts, ...preservedRuleDrafts];

    const proposals = await aiProposalsRepository.createBatch({
      tenantId,
      createdBy: guard.user.id,
      drafts,
      status,
    });

    await sendOperationalAlert({
      key: `ai-proposals-pending-${tenantId}`,
      title: "Nuove proposte AI operative (rule + AI)",
      message: `Generate ${proposals.length} proposte arricchite per tenant ${tenantId}.`,
      severity: "warning",
      metadata: { tenantId, proposals: proposals.length, periodDays, enriched: true },
    });

    return ok({ snapshot, proposals, generated: proposals.length, source: enriched.source, decisions: enriched.decisions });
  }

  const proposals = await aiProposalsRepository.createBatch({
    tenantId,
    createdBy: guard.user.id,
    drafts: ruleDrafts,
    status,
  });

  await sendOperationalAlert({
    key: `ai-proposals-pending-${tenantId}`,
    title: "Nuove proposte AI operative",
    message: `Generate ${proposals.length} proposte in stato ${status} per tenant ${tenantId}.`,
    severity: "warning",
    metadata: { tenantId, proposals: proposals.length, periodDays, generatedBy: guard.user.id },
  });

  return ok({ snapshot, proposals, generated: proposals.length, source: "rules" });
}
