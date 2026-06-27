import { describe, expect, it } from "vitest";
import { MODULE_IDS } from "@/lib/ai/modules/types";
import { MODULE_REGISTRY, MODULE_ALIASES, normalizeModuleId } from "@/lib/ai/modules/config";

describe("module AI registry", () => {
  it("registers all required modules", () => {
    for (const id of MODULE_IDS) {
      expect(MODULE_REGISTRY[id]).toBeDefined();
      expect(MODULE_REGISTRY[id].roles.length).toBeGreaterThan(0);
      expect(MODULE_REGISTRY[id].buildSnapshot).toBeTypeOf("function");
    }
  });

  it("resolves aliases", () => {
    expect(normalizeModuleId("cucina")).toBe("kitchen");
    expect(normalizeModuleId("magazzino")).toBe("inventory");
    expect(normalizeModuleId("KITCHEN")).toBe("kitchen");
  });

  it("rejects unknown modules", () => {
    expect(normalizeModuleId("unknown-module")).toBeNull();
  });

  it("maps aliases to registered modules", () => {
    for (const [alias, target] of Object.entries(MODULE_ALIASES)) {
      expect(normalizeModuleId(alias)).toBe(target);
    }
  });
});
