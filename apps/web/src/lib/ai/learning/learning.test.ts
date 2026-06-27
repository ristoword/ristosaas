import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiProposalDto } from "@/lib/db/repositories/ai-proposals.repository";
import type { AiDecisionEnvelope } from "@/lib/ai/decisions/types";
import {
  extractModuleFromProposal,
  extractConfidenceFromProposal,
  extractDecisionFromProposal,
  extractMotivoFromProposal,
  isLearningEnabled,
} from "@/lib/ai/learning/feedback";
import {
  aggregatePatterns,
  approvalRate,
  buildPatternFromFeedback,
  buildPatternKey,
  extractSignals,
  matchPatterns,
  tokenizeForLearning,
  type LearningPatternRecord,
} from "@/lib/ai/learning/patterns";
import { computeModuleStats, computeTenantStats, patternStrength } from "@/lib/ai/learning/statistics";
import {
  computeAdjustmentFromPattern,
  MIN_SIMILAR_APPROVALS,
  MIN_APPROVAL_RATE,
  buildLearnedContextForEnrich,
} from "@/lib/ai/learning/optimizer";
import type { LearningFeedbackRecord } from "@/lib/ai/learning/feedback";

const sampleProposal = (overrides: Partial<AiProposalDto> = {}): AiProposalDto => ({
  id: "prop-1",
  tenantId: "tenant-1",
  createdBy: "user-creator",
  type: "reorder",
  status: "pending_review",
  title: "Riordino intelligente",
  summary: "Ordina farina e pomodoro per weekend prenotazioni",
  payload: {
    domain: "reorder",
    aiEnhanced: {
      motivation: "Prenotazioni +20% coperti nel weekend",
      confidence: 0.78,
      recommendation: { items: [{ name: "farina", qty: 10 }] },
    },
    ruleBased: {
      summary: "Ordina 5 kg farina",
      recommendation: { items: [{ name: "farina", qty: 5 }] },
    },
  },
  reviewedBy: null,
  reviewedAt: null,
  reviewNotes: null,
  appliedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const sampleDecision = (overrides: Partial<AiDecisionEnvelope> = {}): AiDecisionEnvelope => ({
  domain: "reorder",
  generatedAt: new Date().toISOString(),
  ruleBased: {
    summary: "Ordina 5 kg farina",
    recommendation: { items: [{ name: "farina", qty: 5 }] },
    source: "rules",
  },
  aiEnhanced: {
    recommendation: { items: [{ name: "farina", qty: 10 }] },
    motivation: "Prenotazioni elevate nel weekend",
    confidence: 0.7,
    confidenceLevel: "high",
    dataUsed: ["bookings_7d"],
    fallbackToRule: false,
  },
  reviewStatus: "pending_review",
  ...overrides,
});

describe("learning feedback extraction", () => {
  it("extracts module from domain payload", () => {
    expect(extractModuleFromProposal(sampleProposal())).toBe("reorder");
  });

  it("falls back to proposal type when domain missing", () => {
    expect(extractModuleFromProposal(sampleProposal({ payload: {} }))).toBe("reorder");
  });

  it("extracts confidence from aiEnhanced", () => {
    expect(extractConfidenceFromProposal(sampleProposal())).toBe(0.78);
  });

  it("extracts decision from ai recommendation", () => {
    const decision = extractDecisionFromProposal(sampleProposal());
    expect(decision).toEqual({ items: [{ name: "farina", qty: 10 }] });
  });

  it("prefers review notes as motivo", () => {
    expect(extractMotivoFromProposal(sampleProposal(), "Approvato per evento sabato")).toBe(
      "Approvato per evento sabato",
    );
  });

  it("uses ai motivation when notes absent", () => {
    expect(extractMotivoFromProposal(sampleProposal())).toContain("weekend");
  });
});

describe("learning patterns", () => {
  it("tokenizes italian text removing stopwords", () => {
    const tokens = tokenizeForLearning("Prenotazioni elevate nel weekend per farina");
    expect(tokens).toContain("prenotazioni");
    expect(tokens).toContain("weekend");
    expect(tokens).not.toContain("nel");
  });

  it("builds stable pattern keys for same signals", () => {
    const signals = ["farina", "weekend", "prenotazioni"];
    expect(buildPatternKey("reorder", signals)).toBe(buildPatternKey("reorder", [...signals].reverse()));
  });

  it("aggregates feedback into patterns", () => {
    const feedbacks = Array.from({ length: 6 }, (_, i) => ({
      module: "reorder",
      outcome: "approved" as const,
      motivo: `Prenotazioni weekend farina batch ${i}`,
      confidence: 0.8,
      decision: { items: [{ name: "farina", qty: 10 }] },
      summary: "weekend farina prenotazioni",
    }));

    const patterns = aggregatePatterns(feedbacks);
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].approvalCount).toBe(6);
    expect(patterns[0].rejectionCount).toBe(0);
  });

  it("matches patterns by signal overlap", () => {
    const patterns: LearningPatternRecord[] = [
      {
        tenantId: "t1",
        module: "reorder",
        patternKey: "abc123",
        approvalCount: 8,
        rejectionCount: 1,
        avgConfidence: 0.82,
        signals: ["farina", "weekend", "prenotazioni", "ordine"],
        hints: {},
      },
    ];
    const querySignals = extractSignals("Prenotazioni weekend farina extra");
    const matched = matchPatterns(patterns, "reorder", querySignals);
    expect(matched).toHaveLength(1);
    expect(matched[0].patternKey).toBe("abc123");
  });

  it("computes approval rate", () => {
    expect(approvalRate({ approvalCount: 8, rejectionCount: 2 })).toBe(0.8);
  });
});

describe("learning statistics", () => {
  const feedbacks: LearningFeedbackRecord[] = [
    {
      id: "1",
      tenantId: "t1",
      userId: "u1",
      userRole: "supervisor",
      module: "reorder",
      proposalId: "p1",
      outcome: "approved",
      motivo: "ok",
      decision: {},
      confidence: 0.8,
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      tenantId: "t1",
      userId: "u1",
      userRole: "supervisor",
      module: "reorder",
      proposalId: "p2",
      outcome: "rejected",
      motivo: "no",
      decision: {},
      confidence: 0.5,
      createdAt: new Date().toISOString(),
    },
    {
      id: "3",
      tenantId: "t1",
      userId: "u1",
      userRole: "owner",
      module: "food_cost",
      proposalId: "p3",
      outcome: "approved",
      motivo: "ok",
      decision: {},
      confidence: 0.9,
      createdAt: new Date().toISOString(),
    },
  ];

  it("computes per-module stats", () => {
    const stats = computeModuleStats(feedbacks);
    const reorder = stats.find((s) => s.module === "reorder");
    expect(reorder?.approved).toBe(1);
    expect(reorder?.rejected).toBe(1);
    expect(reorder?.approvalRate).toBe(0.5);
  });

  it("computes tenant-level stats", () => {
    const tenantStats = computeTenantStats("t1", feedbacks, []);
    expect(tenantStats.totalFeedback).toBe(3);
    expect(tenantStats.overallApprovalRate).toBeCloseTo(2 / 3);
  });

  it("scores pattern strength by volume and rate", () => {
    const strong = patternStrength({ approvalCount: 10, rejectionCount: 1 });
    const weak = patternStrength({ approvalCount: 1, rejectionCount: 1 });
    expect(strong).toBeGreaterThan(weak);
  });
});

describe("learning optimizer", () => {
  it("boosts confidence when pattern has many approvals", () => {
    const pattern: LearningPatternRecord = {
      tenantId: "t1",
      module: "reorder",
      patternKey: "pat1",
      approvalCount: MIN_SIMILAR_APPROVALS + 2,
      rejectionCount: 1,
      avgConfidence: 0.85,
      signals: ["farina", "weekend"],
      hints: { approvedMotives: ["Weekend affollato"] },
    };

    const adj = computeAdjustmentFromPattern(pattern);
    expect(adj.confidenceDelta).toBeGreaterThan(0);
    expect(adj.learningNote).toContain("Auto-learning");
  });

  it("penalizes confidence when pattern often rejected", () => {
    const pattern: LearningPatternRecord = {
      tenantId: "t1",
      module: "reorder",
      patternKey: "pat2",
      approvalCount: 1,
      rejectionCount: MIN_SIMILAR_APPROVALS + 1,
      avgConfidence: 0.4,
      signals: ["pricing"],
      hints: {},
    };

    const adj = computeAdjustmentFromPattern(pattern);
    expect(adj.confidenceDelta).toBeLessThan(0);
  });

  it("does not adjust when sample size too small", () => {
    const pattern: LearningPatternRecord = {
      tenantId: "t1",
      module: "reorder",
      patternKey: "pat3",
      approvalCount: 2,
      rejectionCount: 2,
      avgConfidence: 0.5,
      signals: [],
      hints: {},
    };
    const adj = computeAdjustmentFromPattern(pattern);
    expect(adj.confidenceDelta).toBe(0);
  });

  it("builds learned context block for enrich prompt", () => {
    const patterns: LearningPatternRecord[] = [
      {
        tenantId: "t1",
        module: "reorder",
        patternKey: "pat1",
        approvalCount: MIN_SIMILAR_APPROVALS,
        rejectionCount: 0,
        avgConfidence: 0.9,
        signals: ["farina", "weekend"],
        hints: { approvedMotives: ["Evento sabato"] },
      },
    ];
    const ctx = buildLearnedContextForEnrich(patterns, "reorder");
    expect(ctx).toContain("AUTO-LEARNING");
    expect(ctx).toContain("fallback");
    expect(approvalRate(patterns[0])).toBeGreaterThanOrEqual(MIN_APPROVAL_RATE);
  });

  it("buildPatternFromFeedback produces signals from motivo", () => {
    const { signals, patternKey } = buildPatternFromFeedback({
      module: "food_cost",
      outcome: "approved",
      motivo: "Margine critico su carbonara prenotazioni",
      confidence: 0.77,
      decision: { dish: "carbonara" },
    });
    expect(signals.length).toBeGreaterThan(0);
    expect(patternKey.length).toBe(24);
  });
});

describe("learning env", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("is enabled by default", () => {
    delete process.env.AI_LEARNING_ENABLED;
    expect(isLearningEnabled()).toBe(true);
  });

  it("can be disabled", () => {
    vi.stubEnv("AI_LEARNING_ENABLED", "false");
    expect(isLearningEnabled()).toBe(false);
  });
});

describe("learning preserves rule-based fallback", () => {
  it("decision without aiEnhanced is not subject to optimizer logic", () => {
    const decision = sampleDecision({ aiEnhanced: null, reviewStatus: "not_required" });
    expect(decision.ruleBased.source).toBe("rules");
    expect(decision.aiEnhanced).toBeNull();
  });

  it("fallbackToRule decisions skip learning adjustment path", () => {
    const decision = sampleDecision({
      aiEnhanced: {
        recommendation: {},
        motivation: "Fallback",
        confidence: 0.55,
        confidenceLevel: "medium",
        dataUsed: [],
        fallbackToRule: true,
      },
    });
    expect(decision.aiEnhanced?.fallbackToRule).toBe(true);
    expect(decision.ruleBased.recommendation).toEqual({ items: [{ name: "farina", qty: 5 }] });
  });
});

describe("learning optimizer integration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("applies confidence boost when matching pattern exists", async () => {
    vi.doMock("@/lib/db/prisma", () => ({
      prisma: {
        aiLearningPattern: {
          findMany: vi.fn().mockResolvedValue([
            {
              tenantId: "tenant-1",
              module: "reorder",
              patternKey: "learned123",
              approvalCount: 8,
              rejectionCount: 1,
              avgConfidence: 0.85,
              signals: ["farina", "weekend", "prenotazioni", "ordine"],
              hints: { approvedMotives: ["Weekend affollato"] },
            },
          ]),
        },
      },
    }));

    const { optimizeDecision: optimize } = await import("@/lib/ai/learning/optimizer");
    const { decision, adjustment } = await optimize("tenant-1", sampleDecision());

    expect(adjustment.applied).toBe(true);
    expect(adjustment.confidenceDelta).toBeGreaterThan(0);
    expect(decision.aiEnhanced!.confidence).toBeGreaterThan(0.7);
    expect(decision.ruleBased.recommendation).toEqual({ items: [{ name: "farina", qty: 5 }] });
  });
});
