import { describe, expect, it } from "vitest";
import { confidenceFromScore, parseStructuredAiLayer } from "@/lib/ai/decisions/types";
import { decisionToProposalDraft, isAiDecisionDomain } from "@/lib/ai/decisions/proposal-mapper";
import type { AiDecisionEnvelope } from "@/lib/ai/decisions/types";

describe("AI decision types", () => {
  it("maps confidence score to level", () => {
    expect(confidenceFromScore(0.9)).toBe("high");
    expect(confidenceFromScore(0.6)).toBe("medium");
    expect(confidenceFromScore(0.2)).toBe("low");
  });

  it("parses structured AI layer", () => {
    const layer = parseStructuredAiLayer(
      {
        motivation: "Domanda alta nel weekend",
        confidence: 0.82,
        dataUsed: ["bookings_7d", "consumption_14d"],
        recommendation: { qty: 12 },
      },
      false,
    );
    expect(layer?.motivation).toContain("weekend");
    expect(layer?.confidenceLevel).toBe("high");
    expect(layer?.dataUsed).toHaveLength(2);
  });

  it("validates decision domains", () => {
    expect(isAiDecisionDomain("reorder")).toBe(true);
    expect(isAiDecisionDomain("invalid")).toBe(false);
  });
});

describe("proposal mapper", () => {
  it("maps decision envelope to proposal draft with AI metadata", () => {
    const envelope: AiDecisionEnvelope = {
      domain: "reorder",
      generatedAt: new Date().toISOString(),
      ruleBased: {
        summary: "Ordina 5 kg farina",
        recommendation: { items: [] },
        source: "rules",
      },
      aiEnhanced: {
        recommendation: { items: [{ name: "farina", qty: 8 }] },
        motivation: "Prenotazioni +20% coperti",
        confidence: 0.77,
        confidenceLevel: "high",
        dataUsed: ["bookings_7d"],
        fallbackToRule: false,
      },
      reviewStatus: "pending_review",
    };

    const draft = decisionToProposalDraft(envelope);
    expect(draft.type).toBe("reorder");
    expect(draft.payload.domain).toBe("reorder");
    expect(draft.payload.aiEnhanced).toBeTruthy();
    expect(draft.summary).toContain("77%");
  });
});
