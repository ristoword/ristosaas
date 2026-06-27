import type { LearningFeedbackRecord } from "@/lib/ai/learning/feedback";
import type { LearningPatternRecord } from "@/lib/ai/learning/patterns";
import { approvalRate } from "@/lib/ai/learning/patterns";
import { prisma } from "@/lib/db/prisma";

export type ModuleFeedbackStats = {
  module: string;
  total: number;
  approved: number;
  rejected: number;
  cancelled: number;
  approvalRate: number;
  avgConfidenceApproved: number | null;
  avgConfidenceRejected: number | null;
};

export type TenantLearningStats = {
  tenantId: string;
  totalFeedback: number;
  overallApprovalRate: number;
  modules: ModuleFeedbackStats[];
  patternCount: number;
  topApprovedModules: string[];
};

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

export function computeModuleStats(feedbacks: LearningFeedbackRecord[]): ModuleFeedbackStats[] {
  const byModule = new Map<string, LearningFeedbackRecord[]>();
  for (const fb of feedbacks) {
    const list = byModule.get(fb.module) ?? [];
    list.push(fb);
    byModule.set(fb.module, list);
  }

  return [...byModule.entries()].map(([module, rows]) => {
    const approved = rows.filter((r) => r.outcome === "approved");
    const rejected = rows.filter((r) => r.outcome === "rejected");
    const cancelled = rows.filter((r) => r.outcome === "cancelled");

    return {
      module,
      total: rows.length,
      approved: approved.length,
      rejected: rejected.length,
      cancelled: cancelled.length,
      approvalRate: rows.length ? approved.length / (approved.length + rejected.length || 1) : 0,
      avgConfidenceApproved: avg(
        approved.map((r) => r.confidence).filter((c): c is number => c != null),
      ),
      avgConfidenceRejected: avg(
        rejected.map((r) => r.confidence).filter((c): c is number => c != null),
      ),
    };
  });
}

export function computeTenantStats(
  tenantId: string,
  feedbacks: LearningFeedbackRecord[],
  patterns: LearningPatternRecord[],
): TenantLearningStats {
  const modules = computeModuleStats(feedbacks);
  const approved = feedbacks.filter((f) => f.outcome === "approved").length;
  const rejected = feedbacks.filter((f) => f.outcome === "rejected").length;

  const topApprovedModules = [...modules]
    .filter((m) => m.approved >= 3)
    .sort((a, b) => b.approvalRate - a.approvalRate)
    .slice(0, 5)
    .map((m) => m.module);

  return {
    tenantId,
    totalFeedback: feedbacks.length,
    overallApprovalRate: approved + rejected > 0 ? approved / (approved + rejected) : 0,
    modules,
    patternCount: patterns.length,
    topApprovedModules,
  };
}

export function patternStrength(pattern: Pick<LearningPatternRecord, "approvalCount" | "rejectionCount">): number {
  const rate = approvalRate(pattern);
  const volume = pattern.approvalCount + pattern.rejectionCount;
  return rate * Math.log1p(volume);
}

export async function getTenantLearningStats(tenantId: string): Promise<TenantLearningStats> {
  const [feedbacks, patternRows] = await Promise.all([
    prisma.aiLearningFeedback.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.aiLearningPattern.findMany({ where: { tenantId } }),
  ]);

  const feedbackRecords: LearningFeedbackRecord[] = feedbacks.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    userId: r.userId,
    userRole: r.userRole,
    module: r.module,
    proposalId: r.proposalId,
    outcome: r.outcome as LearningFeedbackRecord["outcome"],
    motivo: r.motivo,
    decision: (r.decision ?? {}) as Record<string, unknown>,
    confidence: r.confidence,
    createdAt: r.createdAt.toISOString(),
  }));

  const patterns: LearningPatternRecord[] = patternRows.map((p) => ({
    tenantId: p.tenantId,
    module: p.module,
    patternKey: p.patternKey,
    approvalCount: p.approvalCount,
    rejectionCount: p.rejectionCount,
    avgConfidence: p.avgConfidence,
    signals: Array.isArray(p.signals) ? (p.signals as string[]) : [],
    hints: (p.hints ?? {}) as Record<string, unknown>,
  }));

  return computeTenantStats(tenantId, feedbackRecords, patterns);
}

export async function countFeedbackSinceTrain(tenantId: string, module: string): Promise<number> {
  const latestPattern = await prisma.aiLearningPattern.findFirst({
    where: { tenantId, module },
    orderBy: { updatedAt: "desc" },
  });
  if (!latestPattern) {
    return prisma.aiLearningFeedback.count({ where: { tenantId, module } });
  }
  return prisma.aiLearningFeedback.count({
    where: { tenantId, module, createdAt: { gt: latestPattern.updatedAt } },
  });
}
