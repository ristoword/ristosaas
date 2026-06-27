import { createHash } from "node:crypto";

/** Parole comuni da escludere nel matching pattern (IT). */
const STOPWORDS = new Set([
  "della",
  "delle",
  "dello",
  "nella",
  "nelle",
  "negli",
  "negli",
  "sono",
  "come",
  "perche",
  "quando",
  "dalla",
  "dalla",
  "questo",
  "questa",
  "these",
  "that",
  "with",
  "from",
  "rule",
  "based",
  "confidenza",
  "proposta",
  "modulo",
]);

export type LearningPatternRecord = {
  tenantId: string;
  module: string;
  patternKey: string;
  approvalCount: number;
  rejectionCount: number;
  avgConfidence: number | null;
  signals: string[];
  hints: Record<string, unknown>;
};

export type FeedbackForPattern = {
  module: string;
  outcome: "approved" | "rejected" | "cancelled";
  motivo: string;
  confidence: number | null;
  decision: Record<string, unknown>;
  summary?: string;
};

export function tokenizeForLearning(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

export function extractSignals(...texts: string[]): string[] {
  const freq = new Map<string, number>();
  for (const text of texts) {
    for (const token of tokenizeForLearning(text)) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word);
}

export function buildPatternKey(module: string, signals: string[]): string {
  const normalized = signals.slice(0, 8).sort().join("|");
  const raw = `${module}::${normalized}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

export function buildPatternFromFeedback(feedback: FeedbackForPattern): {
  patternKey: string;
  signals: string[];
} {
  const decisionText = JSON.stringify(feedback.decision ?? {}).slice(0, 500);
  const signals = extractSignals(feedback.motivo, feedback.summary ?? "", decisionText);
  const patternKey = buildPatternKey(feedback.module, signals);
  return { patternKey, signals };
}

export function aggregatePatterns(feedbacks: FeedbackForPattern[]): Omit<LearningPatternRecord, "tenantId">[] {
  const buckets = new Map<
    string,
    {
      module: string;
      patternKey: string;
      signals: string[];
      approvals: FeedbackForPattern[];
      rejections: FeedbackForPattern[];
    }
  >();

  for (const fb of feedbacks) {
    const { patternKey, signals } = buildPatternFromFeedback(fb);
    const bucketKey = `${fb.module}::${patternKey}`;
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        module: fb.module,
        patternKey,
        signals,
        approvals: [],
        rejections: [],
      });
    }
    const bucket = buckets.get(bucketKey)!;
    if (fb.outcome === "approved") bucket.approvals.push(fb);
    else if (fb.outcome === "rejected") bucket.rejections.push(fb);
  }

  return [...buckets.values()].map((b) => {
    const confidences = b.approvals
      .map((a) => a.confidence)
      .filter((c): c is number => c != null && Number.isFinite(c));
    const avgConfidence =
      confidences.length > 0 ? confidences.reduce((s, c) => s + c, 0) / confidences.length : null;

    const approvedMotives = b.approvals.map((a) => a.motivo).filter(Boolean).slice(0, 5);

    return {
      module: b.module,
      patternKey: b.patternKey,
      approvalCount: b.approvals.length,
      rejectionCount: b.rejections.length,
      avgConfidence,
      signals: b.signals,
      hints: {
        approvedMotives,
        sampleDecisions: b.approvals.slice(0, 3).map((a) => a.decision),
      },
    };
  });
}

export function signalOverlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((s) => setB.has(s)).length;
}

export function matchPatterns(
  patterns: LearningPatternRecord[],
  module: string,
  querySignals: string[],
  minOverlap = 2,
): LearningPatternRecord[] {
  return patterns
    .filter((p) => p.module === module)
    .map((p) => ({ pattern: p, overlap: signalOverlap(p.signals, querySignals) }))
    .filter((x) => x.overlap >= minOverlap || querySignals.length === 0)
    .sort((a, b) => {
      const scoreA = a.pattern.approvalCount - a.pattern.rejectionCount + a.overlap;
      const scoreB = b.pattern.approvalCount - b.pattern.rejectionCount + b.overlap;
      return scoreB - scoreA;
    })
    .map((x) => x.pattern);
}

export function approvalRate(pattern: Pick<LearningPatternRecord, "approvalCount" | "rejectionCount">): number {
  const total = pattern.approvalCount + pattern.rejectionCount;
  if (total === 0) return 0;
  return pattern.approvalCount / total;
}
