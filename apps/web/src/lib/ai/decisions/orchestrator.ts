import { buildSupplementalContext } from "@/lib/ai/decisions/context-builder";
import { runDomainEngine } from "@/lib/ai/decisions/domain-engines";
import { decisionsToProposalDrafts } from "@/lib/ai/decisions/proposal-mapper";
import {
  AI_DECISION_DOMAINS,
  type AiDecisionDomain,
  type AiDecisionGenerateRequest,
  type AiDecisionGenerateResult,
} from "@/lib/ai/decisions/types";
import { aiProposalsRepository } from "@/lib/db/repositories/ai-proposals.repository";
import { optimizeDecisions } from "@/lib/ai/learning/optimizer";

export async function generateAiDecisions(
  tenantId: string,
  createdBy: string,
  request: AiDecisionGenerateRequest = {},
): Promise<AiDecisionGenerateResult> {
  const periodDaysRaw = Number(request.periodDays ?? 14);
  const periodDays = Number.isFinite(periodDaysRaw)
    ? Math.min(60, Math.max(1, Math.floor(periodDaysRaw)))
    : 14;

  const domains: AiDecisionDomain[] =
    request.domains && request.domains.length > 0 ? request.domains : [...AI_DECISION_DOMAINS];

  const enrich =
    request.enrich !== false && Boolean(process.env.OPENAI_API_KEY?.trim());
  const supplemental = await buildSupplementalContext(tenantId);

  const engineOptions = {
    tenantId,
    periodDays,
    locale: request.locale ?? "it",
    enrich,
    supplemental,
  };

  const rawDecisions = await Promise.all(domains.map((domain) => runDomainEngine(domain, engineOptions)));
  const decisions = await optimizeDecisions(tenantId, rawDecisions);

  const hasAi = decisions.some((d) => d.aiEnhanced && !d.aiEnhanced.fallbackToRule);
  const generatedAt = new Date().toISOString();

  let proposals: AiDecisionGenerateResult["proposals"];

  if (request.persist) {
    const drafts = decisionsToProposalDrafts(decisions);
    const created = await aiProposalsRepository.createBatch({
      tenantId,
      createdBy,
      drafts,
      status: request.status ?? "pending_review",
    });
    proposals = created.map((p) => ({ id: p.id, type: p.type, status: p.status }));
  }

  return {
    generatedAt,
    periodDays,
    decisions,
    proposals,
    source: hasAi ? "rules+ai" : "rules",
  };
}

export async function generateSingleDomainDecision(
  tenantId: string,
  domain: AiDecisionDomain,
  options?: { periodDays?: number; locale?: string; enrich?: boolean; signal?: AbortSignal },
) {
  const periodDays = options?.periodDays ?? 14;
  const supplemental = await buildSupplementalContext(tenantId);
  const useEnrich = options?.enrich ?? Boolean(process.env.OPENAI_API_KEY?.trim());

  return runDomainEngine(domain, {
    tenantId,
    periodDays,
    locale: options?.locale ?? "it",
    enrich: useEnrich,
    supplemental,
    signal: options?.signal,
  }).then(async (decision) => {
    const [optimized] = await optimizeDecisions(tenantId, [decision]);
    return optimized;
  });
}
