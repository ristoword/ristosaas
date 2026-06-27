import { describe, expect, it } from "vitest";
import { deriveAiSuggestions } from "@/lib/ai/ui/derive-suggestions";
import type { CommandCenterDashboard } from "@/lib/api-client";

const baseDashboard = (): CommandCenterDashboard => ({
  generatedAt: new Date().toISOString(),
  tenantId: "t1",
  filters: { periodDays: 7 },
  status: {
    online: true,
    provider: "OpenAI",
    model: "gpt-4o-mini",
    streamingActive: true,
    ragActive: true,
    vectorDbActive: true,
    memoryActive: true,
    automationActive: true,
    schedulerActive: true,
    lastHeartbeat: new Date().toISOString(),
  },
  kpis: {
    workflowsRunning: 0,
    decisionsToday: 2,
    decisionsTotal: 10,
    automationsCompleted: 1,
    automationsFailed: 0,
    workflowsPending: 2,
    supervisorApprovals: 1,
    avgResponseMs: 1000,
    avgOpenAiMs: 800,
    costTodayEur: 0.1,
    costMonthEur: 1,
    tokensInput: 1000,
    tokensOutput: 400,
    tokensTotal: 1400,
    openAiCalls: 5,
    toolCalls: 1,
    ragSearches: 2,
    documentsConsulted: 1,
  },
  savings: {
    hoursSaved: 1,
    timeSavedMinutes: 60,
    automaticOrders: 1,
    proposalsApproved: 1,
    foodCostOptimized: 1,
    wasteAvoidedKg: 2,
    automaticReorders: 1,
    estimatedRevenueEur: 100,
    estimatedSavingsEur: 50,
  },
  timeline: [
    {
      id: "e1",
      at: new Date().toISOString(),
      level: "warning",
      message: "Attesa approvazione chef",
      module: "food_cost",
    },
  ],
  workflowsLive: [],
  automations: [],
  decisions: [
    {
      id: "d1",
      module: "food_cost",
      decision: "Riduci porzione",
      motivation: "Margine basso",
      confidence: 0.5,
      dataSources: [],
      ruleBased: true,
      openAi: true,
      rag: false,
      status: "pending_review",
      createdAt: new Date().toISOString(),
    },
  ],
  health: [],
  stats: {
    decisions: [],
    tokens: [],
    costs: [],
    workflows: [],
    automations: [],
    savings: [],
    errors: [],
  },
  logs: [],
});

describe("deriveAiSuggestions", () => {
  it("includes pending proposals and workflow hints", () => {
    const suggestions = deriveAiSuggestions(baseDashboard(), [
      {
        id: "p1",
        tenantId: "t1",
        createdBy: "u1",
        type: "warehouse",
        status: "pending_review",
        title: "Riordino farina",
        summary: "Scorte basse",
        payload: {},
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
        appliedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    expect(suggestions.some((s) => s.proposalId === "p1")).toBe(true);
    expect(suggestions.some((s) => s.id === "wf-pending")).toBe(true);
  });
});
