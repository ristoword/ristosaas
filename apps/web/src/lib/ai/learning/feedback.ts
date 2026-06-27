import type { AiProposalDto } from "@/lib/db/repositories/ai-proposals.repository";
import { isAiDecisionDomain } from "@/lib/ai/decisions/proposal-mapper";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { buildPatternFromFeedback } from "@/lib/ai/learning/patterns";
import { trainModulePatterns } from "@/lib/ai/learning/trainer";

export type FeedbackOutcome = "approved" | "rejected" | "cancelled";

export type LearningFeedbackRecord = {
  id: string;
  tenantId: string;
  userId: string;
  userRole: string;
  module: string;
  proposalId: string | null;
  outcome: FeedbackOutcome;
  motivo: string;
  decision: Record<string, unknown>;
  confidence: number | null;
  createdAt: string;
};

export function isLearningEnabled(): boolean {
  return process.env.AI_LEARNING_ENABLED !== "false";
}

export function extractModuleFromProposal(proposal: AiProposalDto): string {
  const payload = proposal.payload ?? {};
  const domain = payload.domain;
  if (typeof domain === "string" && isAiDecisionDomain(domain)) return domain;
  return proposal.type;
}

export function extractConfidenceFromProposal(proposal: AiProposalDto): number | null {
  const payload = proposal.payload ?? {};
  const aiEnhanced = payload.aiEnhanced as { confidence?: unknown } | null | undefined;
  if (aiEnhanced && typeof aiEnhanced.confidence === "number" && Number.isFinite(aiEnhanced.confidence)) {
    return Math.min(1, Math.max(0, aiEnhanced.confidence));
  }
  return null;
}

export function extractDecisionFromProposal(proposal: AiProposalDto): Record<string, unknown> {
  const payload = proposal.payload ?? {};
  const aiEnhanced = payload.aiEnhanced as { recommendation?: unknown } | null | undefined;
  if (aiEnhanced?.recommendation && typeof aiEnhanced.recommendation === "object") {
    return aiEnhanced.recommendation as Record<string, unknown>;
  }
  const ruleBased = payload.ruleBased as { recommendation?: unknown } | null | undefined;
  if (ruleBased?.recommendation && typeof ruleBased.recommendation === "object") {
    return ruleBased.recommendation as Record<string, unknown>;
  }
  return { summary: proposal.summary, title: proposal.title, type: proposal.type };
}

export function extractMotivoFromProposal(proposal: AiProposalDto, notes?: string): string {
  const trimmedNotes = notes?.trim();
  if (trimmedNotes) return trimmedNotes;

  const payload = proposal.payload ?? {};
  const aiEnhanced = payload.aiEnhanced as { motivation?: unknown } | null | undefined;
  if (typeof aiEnhanced?.motivation === "string" && aiEnhanced.motivation.trim()) {
    return aiEnhanced.motivation.trim();
  }
  return proposal.summary.trim();
}

function mapFeedback(row: {
  id: string;
  tenantId: string;
  userId: string;
  userRole: string;
  module: string;
  proposalId: string | null;
  outcome: string;
  motivo: string;
  decision: unknown;
  confidence: number | null;
  createdAt: Date;
}): LearningFeedbackRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    userRole: row.userRole,
    module: row.module,
    proposalId: row.proposalId,
    outcome: row.outcome as FeedbackOutcome,
    motivo: row.motivo,
    decision: (row.decision ?? {}) as Record<string, unknown>,
    confidence: row.confidence,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function recordSupervisorFeedback(params: {
  tenantId: string;
  userId: string;
  userRole: string;
  proposal: AiProposalDto;
  action: "approve" | "reject" | "cancel";
  notes?: string;
}): Promise<LearningFeedbackRecord | null> {
  if (!isLearningEnabled()) return null;

  const outcome: FeedbackOutcome =
    params.action === "approve" ? "approved" : params.action === "reject" ? "rejected" : "cancelled";

  const module = extractModuleFromProposal(params.proposal);
  const confidence = extractConfidenceFromProposal(params.proposal);
  const decision = extractDecisionFromProposal(params.proposal);
  const motivo = extractMotivoFromProposal(params.proposal, params.notes);

  try {
    const row = await prisma.aiLearningFeedback.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        userRole: params.userRole ?? "",
        module,
        proposalId: params.proposal.id,
        outcome,
        motivo,
        decision: decision as Prisma.InputJsonValue,
        confidence,
      },
    });

    if (outcome === "approved" || outcome === "rejected") {
      await trainModulePatterns(params.tenantId, module).catch(() => undefined);
    }

    return mapFeedback(row);
  } catch {
    return null;
  }
}

export async function listFeedback(
  tenantId: string,
  filters?: { module?: string; outcome?: FeedbackOutcome; limit?: number },
): Promise<LearningFeedbackRecord[]> {
  const rows = await prisma.aiLearningFeedback.findMany({
    where: {
      tenantId,
      ...(filters?.module ? { module: filters.module } : {}),
      ...(filters?.outcome ? { outcome: filters.outcome } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(500, Math.max(1, filters?.limit ?? 100)),
  });
  return rows.map(mapFeedback);
}

export { buildPatternFromFeedback };
