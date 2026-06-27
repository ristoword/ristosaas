import { describe, expect, it, vi, beforeEach } from "vitest";
import { modulesFromScores, routeQuery, scoreModule } from "@/lib/ai/orchestrator/router";
import { ruleBasedPlan } from "@/lib/ai/orchestrator/planner";
import { executeModules } from "@/lib/ai/orchestrator/executor";
import { unifyRuleBasedResponse, buildOrchestratorResponse } from "@/lib/ai/orchestrator/response";
import type { OrchestratorContext, OrchestratorModuleResult } from "@/lib/ai/orchestrator/types";

describe("orchestrator router", () => {
  it("routes food cost and inventory keywords", () => {
    const scores = routeQuery("Controlla food cost e scorte magazzino in scadenza");
    const modules = modulesFromScores(scores);
    expect(modules).toContain("foodcost");
    expect(modules).toContain("inventory");
  });

  it("routes hotel and reception keywords", () => {
    const scores = routeQuery("Arrivi hotel oggi e check-in reception");
    const modules = modulesFromScores(scores);
    expect(modules).toContain("hotel");
    expect(modules.some((m) => m === "reception" || m === "hotel")).toBe(true);
  });

  it("boosts module from context hint", () => {
    const scores = routeQuery("situazione di oggi", { contextHint: "cucina" });
    const modules = modulesFromScores(scores);
    expect(modules[0]).toBe("kitchen");
  });

  it("falls back to dashboard for generic queries", () => {
    const scores = routeQuery("xyz abc unknown");
    const modules = modulesFromScores(scores);
    expect(modules).toContain("dashboard");
  });

  it("scores cantina keywords", () => {
    const score = scoreModule("Promozioni vini cantina annata 2015", "cantina");
    expect(score.score).toBeGreaterThan(0);
    expect(score.matchedKeywords.length).toBeGreaterThan(0);
  });
});

describe("orchestrator planner", () => {
  it("builds rule-based plan without OpenAI", () => {
    const plan = ruleBasedPlan("Riordino magazzino e food cost piatti", "magazzino");
    expect(plan.modules.length).toBeGreaterThan(0);
    expect(plan.modules).toContain("inventory");
    expect(plan.source).toBe("rules");
    expect(plan.reasoning).toContain("rule-based");
  });
});

describe("orchestrator executor", () => {
  const mockCtx: OrchestratorContext = {
    tenantId: "tenant-1",
    userId: "user-1",
    locale: "it",
    periodDays: 14,
    ragContext: null,
    query: "test",
  };

  it("executes modules via injected runner", async () => {
    const moduleRunner = vi.fn(async (slug: string) => ({
      module: slug as "sala",
      generatedAt: new Date().toISOString(),
      snapshot: { test: true, slug },
      insights: null,
      source: "rules" as const,
    }));

    const results = await executeModules(["sala", "bar"], mockCtx, { moduleRunner });

    expect(results).toHaveLength(2);
    expect(results[0].module).toBe("sala");
    expect(results[0].snapshot).toEqual({ test: true, slug: "sala" });
    expect(moduleRunner).toHaveBeenCalledTimes(2);
  });

  it("captures module errors without throwing", async () => {
    const moduleRunner = vi.fn(async () => {
      throw new Error("db down");
    });

    const results = await executeModules(["crm"], mockCtx, { moduleRunner });
    expect(results[0].error).toBe("db down");
    expect(results[0].source).toBe("rules");
  });
});

describe("orchestrator response", () => {
  const ctx: OrchestratorContext = {
    tenantId: "t1",
    locale: "it",
    periodDays: 14,
    ragContext: "RAG context",
    query: "food cost oggi",
  };

  const modules: OrchestratorModuleResult[] = [
    {
      module: "foodcost",
      moduleId: "foodcost",
      snapshot: { marginPct: 22 },
      insights: null,
      source: "rules",
    },
  ];

  it("unifies rule-based fallback response", () => {
    const plan = ruleBasedPlan("food cost oggi");
    const reply = unifyRuleBasedResponse("food cost oggi", plan, modules, ctx);
    expect(reply).toContain("rule-based fallback");
    expect(reply).toContain("foodcost");
    expect(reply).toContain("food cost oggi");
  });

  it("builds orchestrator response envelope", () => {
    const plan = ruleBasedPlan("test");
    const response = buildOrchestratorResponse({
      query: "test",
      plan,
      modules,
      ctx,
      reply: "risposta",
      source: "rules",
    });
    expect(response.reply).toBe("risposta");
    expect(response.ragUsed).toBe(true);
    expect(response.modules).toHaveLength(1);
  });
});

describe("orchestrator integration (mocked)", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "");
  });

  it("runOrchestrator returns unified rule-based reply", async () => {
    vi.resetModules();
    vi.doMock("@/lib/ai/module-ai.service", () => ({
      runModuleAi: vi.fn(async (slug: string) => ({
        module: slug,
        generatedAt: new Date().toISOString(),
        snapshot: { ok: true },
        insights: null,
        source: "rules",
      })),
    }));
    vi.doMock("@/lib/ai/rag", () => ({
      retrieveManualContext: vi.fn(async () => null),
    }));

    const { runOrchestrator } = await import("@/lib/ai/orchestrator/index");
    const result = await runOrchestrator({
      tenantId: "tenant-test",
      request: { query: "Situazione food cost e magazzino", contextHint: "cucina" },
    });

    expect(result.reply.length).toBeGreaterThan(0);
    expect(result.plan.modules.length).toBeGreaterThan(0);
    expect(result.source).toBe("rules");
    expect(result.modules.length).toBe(result.plan.modules.length);
  });
});
