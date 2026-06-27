import type { FeedbackForPattern } from "@/lib/ai/learning/patterns";
import { aggregatePatterns } from "@/lib/ai/learning/patterns";
import { isLearningEnabled, listFeedback } from "@/lib/ai/learning/feedback";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export type TrainingResult = {
  tenantId: string;
  module: string;
  patternsUpdated: number;
  feedbackProcessed: number;
};

export async function trainModulePatterns(tenantId: string, module: string): Promise<TrainingResult> {
  if (!isLearningEnabled()) {
    return { tenantId, module, patternsUpdated: 0, feedbackProcessed: 0 };
  }

  const feedbacks = await listFeedback(tenantId, { module, limit: 500 });
  const forPatterns: FeedbackForPattern[] = feedbacks
    .filter((f) => f.outcome === "approved" || f.outcome === "rejected")
    .map((f) => ({
      module: f.module,
      outcome: f.outcome,
      motivo: f.motivo,
      confidence: f.confidence,
      decision: f.decision,
      summary: f.motivo,
    }));

  const aggregated = aggregatePatterns(forPatterns);

  await Promise.all(
    aggregated.map((pattern) =>
      prisma.aiLearningPattern.upsert({
        where: {
          tenantId_module_patternKey: {
            tenantId,
            module: pattern.module,
            patternKey: pattern.patternKey,
          },
        },
        create: {
          tenantId,
          module: pattern.module,
          patternKey: pattern.patternKey,
          approvalCount: pattern.approvalCount,
          rejectionCount: pattern.rejectionCount,
          avgConfidence: pattern.avgConfidence,
          signals: pattern.signals as Prisma.InputJsonValue,
          hints: pattern.hints as Prisma.InputJsonValue,
        },
        update: {
          approvalCount: pattern.approvalCount,
          rejectionCount: pattern.rejectionCount,
          avgConfidence: pattern.avgConfidence,
          signals: pattern.signals as Prisma.InputJsonValue,
          hints: pattern.hints as Prisma.InputJsonValue,
        },
      }),
    ),
  );

  return {
    tenantId,
    module,
    patternsUpdated: aggregated.length,
    feedbackProcessed: forPatterns.length,
  };
}

export async function trainTenant(tenantId: string): Promise<TrainingResult[]> {
  if (!isLearningEnabled()) return [];

  const modules = await prisma.aiLearningFeedback.findMany({
    where: { tenantId },
    distinct: ["module"],
    select: { module: true },
  });

  const results: TrainingResult[] = [];
  for (const { module } of modules) {
    results.push(await trainModulePatterns(tenantId, module));
  }
  return results;
}

export async function getLearnedPatterns(tenantId: string, module?: string) {
  const rows = await prisma.aiLearningPattern.findMany({
    where: { tenantId, ...(module ? { module } : {}) },
    orderBy: [{ approvalCount: "desc" }, { updatedAt: "desc" }],
    take: 100,
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
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function getLearnedContextBlock(tenantId: string, module: string): Promise<string | null> {
  const { buildLearnedContextForEnrich } = await import("@/lib/ai/learning/optimizer");
  const patterns = await getLearnedPatterns(tenantId, module);
  return buildLearnedContextForEnrich(patterns, module);
}
