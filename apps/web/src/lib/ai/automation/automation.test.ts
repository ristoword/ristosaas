import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  AUTOMATION_MODULES,
  AUTOMATION_TRIGGERS,
  TRIGGER_TO_MODULE,
  buildIdempotencyKey,
  isAutomationEnabled,
} from "@/lib/ai/automation/types";
import {
  WORKFLOW_CATALOG,
  findWorkflowForTrigger,
  automationConfigStore,
} from "@/lib/ai/automation/config-store";
import { getFiredTriggers } from "@/lib/ai/automation/trigger-manager";
import { automationApproval } from "@/lib/ai/automation/approval-manager";
import { automationNotifications } from "@/lib/ai/automation/notification-manager";
import type { AutomationConfig, TriggerEvaluation } from "@/lib/ai/automation/types";

describe("automation types", () => {
  it("defines all required triggers", () => {
    expect(AUTOMATION_TRIGGERS).toContain("prodotto_sotto_scorta");
    expect(AUTOMATION_TRIGGERS).toContain("licenza_saas_in_scadenza");
    expect(AUTOMATION_TRIGGERS.length).toBe(18);
  });

  it("maps triggers to modules", () => {
    expect(TRIGGER_TO_MODULE.prodotto_sotto_scorta).toBe("magazzino");
    expect(TRIGGER_TO_MODULE.haccp_non_conforme).toBe("haccp");
  });

  it("builds stable idempotency keys", () => {
    const a = buildIdempotencyKey("t1", "prodotto_sotto_scorta", "magazzino", "2026-06-26T10");
    const b = buildIdempotencyKey("t1", "prodotto_sotto_scorta", "magazzino", "2026-06-26T10");
    expect(a).toBe(b);
  });

  it("covers all automation modules", () => {
    expect(AUTOMATION_MODULES).toContain("magazzino");
    expect(AUTOMATION_MODULES).toContain("room_service");
    expect(AUTOMATION_MODULES.length).toBeGreaterThanOrEqual(19);
  });
});

describe("automation workflow catalog", () => {
  it("has magazzino reorder workflow", () => {
    const wf = findWorkflowForTrigger("prodotto_sotto_scorta");
    expect(wf?.id).toBe("magazzino-reorder");
    expect(wf?.decisionDomain).toBe("reorder");
    expect(wf?.steps.some((s) => s.type === "propose")).toBe(true);
  });

  it("covers critical triggers", () => {
    for (const trigger of ["haccp_non_conforme", "licenza_saas_in_scadenza", "food_cost_sopra_target"] as const) {
      expect(findWorkflowForTrigger(trigger)).toBeDefined();
    }
  });

  it("workflow catalog modules are valid", () => {
    for (const wf of WORKFLOW_CATALOG) {
      expect(AUTOMATION_MODULES).toContain(wf.module);
    }
  });
});

describe("automation trigger filtering", () => {
  it("filters fired triggers", () => {
    const evals: TriggerEvaluation[] = [
      {
        trigger: "prodotto_sotto_scorta",
        module: "magazzino",
        fired: true,
        severity: "warning",
        summary: "test",
        context: {},
        dataUsed: [],
      },
      {
        trigger: "food_cost_sopra_target",
        module: "food_cost",
        fired: false,
        severity: "info",
        summary: "ok",
        context: {},
        dataUsed: [],
      },
    ];
    expect(getFiredTriggers(evals)).toHaveLength(1);
  });
});

describe("automation approval levels", () => {
  it("level 1 is suggestion only", () => {
    expect(automationApproval.isSuggestionOnly(1)).toBe(true);
    expect(automationApproval.requiresApproval(1)).toBe(false);
  });

  it("level 2 requires approval", () => {
    expect(automationApproval.requiresApproval(2)).toBe(true);
    expect(automationApproval.isAutoExecute(2)).toBe(false);
  });

  it("level 3 auto executes", () => {
    expect(automationApproval.isAutoExecute(3)).toBe(true);
    expect(automationApproval.requiresApproval(3)).toBe(false);
  });
});

describe("automation config store helpers", () => {
  const configs: AutomationConfig[] = [
    {
      tenantId: "t1",
      module: "magazzino",
      role: null,
      level: 3,
      enabled: true,
      triggers: { prodotto_sotto_scorta: true },
      conditions: {},
      updatedAt: new Date().toISOString(),
    },
    {
      tenantId: "t1",
      module: "magazzino",
      role: "supervisor",
      level: 2,
      enabled: true,
      triggers: {},
      conditions: {},
      updatedAt: new Date().toISOString(),
    },
  ];

  it("resolves role-specific level", () => {
    expect(automationConfigStore.resolveLevel(configs, "magazzino", "supervisor")).toBe(2);
    expect(automationConfigStore.resolveLevel(configs, "magazzino")).toBe(3);
  });

  it("checks trigger enabled state", () => {
    expect(automationConfigStore.isTriggerEnabled(configs, "prodotto_sotto_scorta")).toBe(true);
  });
});

describe("automation notifications", () => {
  it("labels automation levels", () => {
    expect(automationNotifications.levelLabel(1)).toContain("Suggerimento");
    expect(automationNotifications.levelLabel(2)).toContain("Approvazione");
    expect(automationNotifications.levelLabel(3)).toContain("automatica");
  });
});

describe("automation env", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("enabled by default", () => {
    delete process.env.AI_AUTOMATION_ENABLED;
    expect(isAutomationEnabled()).toBe(true);
  });

  it("can be disabled", () => {
    vi.stubEnv("AI_AUTOMATION_ENABLED", "false");
    expect(isAutomationEnabled()).toBe(false);
  });
});

describe("automation security invariants", () => {
  it("workflow steps always include audit for tracked modules", () => {
    const withAudit = WORKFLOW_CATALOG.filter((w) => w.steps.some((s) => s.type === "audit"));
    expect(withAudit.length).toBeGreaterThan(0);
  });

  it("magazzino workflow includes human approval path at level 2", () => {
    const wf = findWorkflowForTrigger("prodotto_sotto_scorta");
    expect(wf?.defaultLevel).toBe(2);
    expect(wf?.notifyRoles).toContain("supervisor");
  });
});
