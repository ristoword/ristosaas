import { describe, expect, it, beforeEach } from "vitest";
import {
  invalidateAiRuntimeCache,
  isAutomationEnabledSync,
  isMasterEnabledSync,
  isMemoryEnabledSync,
  isRagEnabledSync,
  isToolCallingEnabledSync,
} from "@/lib/ai/platform-config.runtime";

describe("platform-config.runtime sync helpers", () => {
  beforeEach(() => {
    invalidateAiRuntimeCache();
    delete process.env.AI_MASTER_ENABLED;
    delete process.env.AI_MEMORY_ENABLED;
    delete process.env.AI_RAG_ENABLED;
    delete process.env.AI_TOOL_CALLING_ENABLED;
    delete process.env.AI_AUTOMATION_ENABLED;
  });

  it("allows features when env kill-switches are unset", () => {
    expect(isMasterEnabledSync()).toBe(true);
    expect(isMemoryEnabledSync()).toBe(true);
    expect(isRagEnabledSync()).toBe(true);
    expect(isToolCallingEnabledSync()).toBe(true);
    expect(isAutomationEnabledSync()).toBe(true);
  });

  it("blocks features when env kill-switch is false", () => {
    process.env.AI_RAG_ENABLED = "false";
    process.env.AI_TOOL_CALLING_ENABLED = "false";
    expect(isRagEnabledSync()).toBe(false);
    expect(isToolCallingEnabledSync()).toBe(false);
  });

  it("blocks master when AI_MASTER_ENABLED is false", () => {
    process.env.AI_MASTER_ENABLED = "false";
    expect(isMasterEnabledSync()).toBe(false);
  });
});
