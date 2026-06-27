import { describe, expect, it } from "vitest";
import { buildCommandCenterCsv } from "@/lib/ai/command-center/dashboard-service";
import type { CommandCenterDashboard } from "@/lib/ai/command-center/types";

const sampleDashboard = (): CommandCenterDashboard => ({
  generatedAt: new Date().toISOString(),
  tenantId: "tenant-1",
  filters: { periodDays: 30 },
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
    workflowsRunning: 1,
    decisionsToday: 5,
    decisionsTotal: 100,
    automationsCompleted: 12,
    automationsFailed: 1,
    workflowsPending: 2,
    supervisorApprovals: 8,
    avgResponseMs: 1200,
    avgOpenAiMs: 890,
    costTodayEur: 0.05,
    costMonthEur: 1.2,
    tokensInput: 8000,
    tokensOutput: 3000,
    tokensTotal: 11000,
    openAiCalls: 45,
    toolCalls: 6,
    ragSearches: 10,
    documentsConsulted: 4,
  },
  savings: {
    hoursSaved: 5.5,
    timeSavedMinutes: 330,
    automaticOrders: 3,
    proposalsApproved: 8,
    foodCostOptimized: 2,
    wasteAvoidedKg: 12,
    automaticReorders: 3,
    estimatedRevenueEur: 960,
    estimatedSavingsEur: 540,
  },
  timeline: [
    {
      id: "t1",
      at: new Date().toISOString(),
      level: "success",
      message: "Riordino Farina completato",
      module: "magazzino",
    },
  ],
  workflowsLive: [],
  automations: [],
  decisions: [
    {
      id: "d1",
      module: "reorder",
      decision: "Riordino farina",
      motivation: "Scorte basse",
      confidence: 0.82,
      dataSources: ["warehouse"],
      ruleBased: true,
      openAi: true,
      rag: false,
      status: "pending_review",
      createdAt: new Date().toISOString(),
    },
  ],
  health: [{ id: "openai", label: "OpenAI", status: "green", detail: "ok" }],
  stats: {
    decisions: [{ date: "2026-06-26", value: 3 }],
    tokens: [{ date: "2026-06-26", value: 2550 }],
    costs: [{ date: "2026-06-26", value: 0.1 }],
    workflows: [{ date: "2026-06-26", value: 1 }],
    automations: [{ date: "2026-06-26", value: 1 }],
    savings: [{ date: "2026-06-26", value: 45 }],
    errors: [{ date: "2026-06-26", value: 0 }],
  },
  logs: [{ id: "l1", at: new Date().toISOString(), level: "info", module: "chat", message: "OK" }],
});

describe("command center export", () => {
  it("builds CSV with KPI and decisions", () => {
    const csv = buildCommandCenterCsv(sampleDashboard());
    expect(csv).toContain("kpi,decisions_today,5");
    expect(csv).toContain("decision,reorder");
    expect(csv).toContain("savings,hours_saved,5.5");
  });
});

describe("command center dashboard shape", () => {
  it("includes all major sections", () => {
    const d = sampleDashboard();
    expect(d.status.online).toBe(true);
    expect(d.kpis.tokensTotal).toBeGreaterThan(0);
    expect(d.savings.estimatedSavingsEur).toBeGreaterThan(0);
    expect(d.health.length).toBeGreaterThan(0);
    expect(d.stats.decisions.length).toBeGreaterThan(0);
  });
});
