import { describe, expect, it } from "vitest";
import {
  AUTOMATION_TO_MODULE,
  MODULE_TO_AUTOMATION,
  ORCHESTRATOR_TO_MODULE,
  resolveAutomationModule,
  resolveModuleId,
  resolveNavAiModule,
  resolveOrchestratorModuleId,
  orchestratorToModuleId,
  moduleToAutomation,
} from "@/lib/ai/module-ids";

describe("module-ids cross-namespace resolution", () => {
  it("resolves Italian aliases to registry IDs", () => {
    expect(resolveModuleId("cucina")).toBe("kitchen");
    expect(resolveModuleId("magazzino")).toBe("inventory");
    expect(resolveModuleId("food-cost")).toBe("foodcost");
    expect(resolveModuleId("food_cost")).toBe("foodcost");
  });

  it("resolves orchestrator hints across namespaces", () => {
    expect(resolveOrchestratorModuleId("cucina")).toBe("kitchen");
    expect(resolveOrchestratorModuleId("magazzino")).toBe("inventory");
    expect(resolveOrchestratorModuleId("food_cost")).toBe("foodcost");
    expect(resolveOrchestratorModuleId("kitchen")).toBe("kitchen");
  });

  it("maps orchestrator to module registry 1:1", () => {
    expect(orchestratorToModuleId("kitchen")).toBe("kitchen");
    expect(orchestratorToModuleId("foodcost")).toBe("foodcost");
    expect(orchestratorToModuleId("inventory")).toBe("inventory");
    expect(ORCHESTRATOR_TO_MODULE.kitchen).toBe("kitchen");
  });

  it("maps registry to automation slugs", () => {
    expect(moduleToAutomation("kitchen")).toBeNull();
    expect(moduleToAutomation("foodcost")).toBe("food_cost");
    expect(moduleToAutomation("inventory")).toBe("magazzino");
    expect(MODULE_TO_AUTOMATION.foodcost).toBe("food_cost");
    expect(MODULE_TO_AUTOMATION.inventory).toBe("magazzino");
  });

  it("maps automation slugs back to registry", () => {
    expect(resolveAutomationModule("magazzino")).toBe("magazzino");
    expect(resolveAutomationModule("food_cost")).toBe("food_cost");
    expect(AUTOMATION_TO_MODULE.magazzino).toBe("inventory");
    expect(AUTOMATION_TO_MODULE.food_cost).toBe("foodcost");
  });

  it("resolves nav IDs consistently", () => {
    expect(resolveNavAiModule("cucina")).toBe("food_cost");
    expect(resolveNavAiModule("magazzino")).toBe("magazzino");
    expect(resolveNavAiModule("food-cost")).toBe("food_cost");
    expect(resolveNavAiModule("ai-command-center")).toBe("supervisor");
  });

  it("rejects unknown slugs", () => {
    expect(resolveModuleId("unknown-xyz")).toBeNull();
    expect(resolveOrchestratorModuleId("licenses")).toBeNull();
  });
});
