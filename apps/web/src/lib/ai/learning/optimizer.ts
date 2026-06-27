import type { AiDecisionEnvelope } from "@/lib/ai/decisions/types";
import { confidenceFromScore } from "@/lib/ai/decisions/types";
import { isLearningEnabled } from "@/lib/ai/learning/feedback";
import {
  approvalRate,
  buildPatternFromFeedback,
  extractSignals,
  matchPatterns,
  type LearningPatternRecord,
} from "@/lib/ai/learning/patterns";
import { prisma } from "@/lib/db/prisma";

/** Approvazioni minime simili per applicare boost automatico. */
export const MIN_SIMILAR_APPROVALS = 5;
/** Soglia approval rate per considerare un pattern affidabile. */
export const MIN_APPROVAL_RATE = 0.72;
/** Boost massimo sulla confidence AI (non tocca le regole). */
export const MAX_CONFIDENCE_BOOST = 0.12;
/** Penalità massima se pattern spesso rifiutato. */
export const MAX_CONFIDENCE_PENALTY = 0.15;

export type LearningAdjustment = {
  applied: boolean;
  module: string;
  patternKey: string | null;
  confidenceDelta: number;
  learningNote: string | null;
  approvalCount: number;
  rejectionCount: number;
};

async function loadPatterns(tenantId: string, module: string): Promise<LearningPatternRecord[]> {
  const rows = await prisma.aiLearningPattern.findMany({
    where: { tenantId, module },
    orderBy: { approvalCount: "desc" },
    take: 50,
  });
  return rows.map((p) => ({
    tenantId: p.tenantId,
    module: p.module,
    patternKey: p.patternKey,
    approvalCount: p.approvalCount,
    rejectionCount: p.rejectionCount,
    avgConfidence: p.avgConfidence,
    signals: Array.isArray(p.signals) ? (p.signals as string[]) : [],
    hints: (p.hints ?? {}) as Record<string, unknown>,
  }));
}

function buildLearningNote(pattern: LearningPatternRecord): string {
  const motives = pattern.hints.approvedMotives;
  if (Array.isArray(motives) && motives.length > 0) {
    const top = motives.filter((m): m is string => typeof m === "string").slice(0, 2);
    if (top.length) {
      return `[Auto-learning] Pattern approvato ${pattern.approvalCount}× dal supervisor: ${top.join(" | ")}`;
    }
  }
  return `[Auto-learning] Pattern approvato ${pattern.approvalCount}× (tasso ${Math.round(approvalRate(pattern) * 100)}%)`;
}

export function computeAdjustmentFromPattern(
  pattern: LearningPatternRecord,
): Pick<LearningAdjustment, "confidenceDelta" | "learningNote" | "patternKey"> {
  const rate = approvalRate(pattern);
  const total = pattern.approvalCount + pattern.rejectionCount;

  if (pattern.approvalCount >= MIN_SIMILAR_APPROVALS && rate >= MIN_APPROVAL_RATE) {
    const volumeFactor = Math.min(1, pattern.approvalCount / (MIN_SIMILAR_APPROVALS * 2));
    const confidenceDelta = MAX_CONFIDENCE_BOOST * rate * volumeFactor;
    return {
      patternKey: pattern.patternKey,
      confidenceDelta,
      learningNote: buildLearningNote(pattern),
    };
  }

  if (pattern.rejectionCount >= MIN_SIMILAR_APPROVALS && rate < 1 - MIN_APPROVAL_RATE) {
    const confidenceDelta = -MAX_CONFIDENCE_PENALTY * (1 - rate);
    return {
      patternKey: pattern.patternKey,
      confidenceDelta,
      learningNote: `[Auto-learning] Pattern spesso rifiutato (${pattern.rejectionCount}×): preferire fallback rule-based`,
    };
  }

  if (total >= 3 && rate >= 0.85 && pattern.approvalCount >= 3) {
    return {
      patternKey: pattern.patternKey,
      confidenceDelta: MAX_CONFIDENCE_BOOST * 0.5,
      learningNote: buildLearningNote(pattern),
    };
  }

  return { patternKey: pattern.patternKey, confidenceDelta: 0, learningNote: null };
}

export async function optimizeDecision(
  tenantId: string,
  decision: AiDecisionEnvelope,
): Promise<{ decision: AiDecisionEnvelope; adjustment: LearningAdjustment }> {
  const noop: LearningAdjustment = {
    applied: false,
    module: decision.domain,
    patternKey: null,
    confidenceDelta: 0,
    learningNote: null,
    approvalCount: 0,
    rejectionCount: 0,
  };

  if (!isLearningEnabled() || !decision.aiEnhanced || decision.aiEnhanced.fallbackToRule) {
    return { decision, adjustment: noop };
  }

  const queryText = [
    decision.ruleBased.summary,
    decision.aiEnhanced.motivation,
    JSON.stringify(decision.aiEnhanced.recommendation).slice(0, 400),
  ].join(" ");

  const { patternKey, signals } = buildPatternFromFeedback({
    module: decision.domain,
    outcome: "approved",
    motivo: decision.aiEnhanced.motivation,
    confidence: decision.aiEnhanced.confidence,
    decision: decision.aiEnhanced.recommendation,
    summary: decision.ruleBased.summary,
  });

  const patterns = await loadPatterns(tenantId, decision.domain);
  const matched = matchPatterns(patterns, decision.domain, signals);
  const best = matched[0];

  if (!best) {
    return { decision, adjustment: noop };
  }

  const { confidenceDelta, learningNote } = computeAdjustmentFromPattern(best);
  if (confidenceDelta === 0 && !learningNote) {
    return { decision, adjustment: noop };
  }

  const newConfidence = Math.min(0.98, Math.max(0.05, decision.aiEnhanced.confidence + confidenceDelta));
  const motivationParts = [decision.aiEnhanced.motivation];
  if (learningNote && confidenceDelta > 0) motivationParts.push(learningNote);

  const optimized: AiDecisionEnvelope = {
    ...decision,
    aiEnhanced: {
      ...decision.aiEnhanced,
      confidence: newConfidence,
      confidenceLevel: confidenceFromScore(newConfidence),
      motivation: motivationParts.filter(Boolean).join("\n"),
      recommendation: {
        ...decision.aiEnhanced.recommendation,
        _learning: {
          patternKey: best.patternKey,
          confidenceDelta,
          queryPatternKey: patternKey,
          approvalCount: best.approvalCount,
          rejectionCount: best.rejectionCount,
          signals: extractSignals(queryText).slice(0, 8),
        },
      },
    },
  };

  return {
    decision: optimized,
    adjustment: {
      applied: true,
      module: decision.domain,
      patternKey: best.patternKey,
      confidenceDelta,
      learningNote,
      approvalCount: best.approvalCount,
      rejectionCount: best.rejectionCount,
    },
  };
}

export async function optimizeDecisions(
  tenantId: string,
  decisions: AiDecisionEnvelope[],
): Promise<AiDecisionEnvelope[]> {
  if (!isLearningEnabled()) return decisions;
  const results = await Promise.all(decisions.map((d) => optimizeDecision(tenantId, d)));
  return results.map((r) => r.decision);
}

export function buildLearnedContextForEnrich(
  patterns: LearningPatternRecord[],
  module: string,
): string | null {
  const relevant = patterns
    .filter((p) => p.module === module && p.approvalCount >= MIN_SIMILAR_APPROVALS)
    .filter((p) => approvalRate(p) >= MIN_APPROVAL_RATE)
    .slice(0, 3);

  if (relevant.length === 0) return null;

  const lines = relevant.map((p) => {
    const motives = p.hints.approvedMotives;
    const motiveText = Array.isArray(motives)
      ? motives.filter((m): m is string => typeof m === "string").slice(0, 1).join("")
      : "";
    return `- Pattern ${p.patternKey.slice(0, 8)}…: ${p.approvalCount} approvazioni, segnali [${p.signals.slice(0, 5).join(", ")}]${motiveText ? ` — "${motiveText}"` : ""}`;
  });

  return [
    "=== AUTO-LEARNING SUPERVISOR (solo orientamento, regole restano fallback) ===",
    ...lines,
    "Allinea le proposte AI ai pattern approvati. Non contraddire i numeri rule-based.",
  ].join("\n");
}
