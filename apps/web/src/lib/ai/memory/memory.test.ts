import { describe, expect, it, vi, beforeEach } from "vitest";
import type { MemoryTurnRecord } from "@/lib/ai/memory/conversation-store";
import {
  turnsToHistoryMessages,
  formatHistoryForPrompt,
  extractToolsFromTurns,
  extractRecentDecisions,
} from "@/lib/ai/memory/history";
import { buildLocalSummary } from "@/lib/ai/memory/summary";
import { compressTextBlock, COMPRESS_AFTER_TURNS } from "@/lib/ai/memory/compression";
import { isMemoryEnabled } from "@/lib/ai/memory/context-manager";

const sampleTurn = (overrides: Partial<MemoryTurnRecord> = {}): MemoryTurnRecord => ({
  id: "t1",
  tenantId: "tenant-1",
  userId: "user-1",
  channel: "chat",
  context: "cucina",
  userMessage: "Cosa devo preparare oggi?",
  assistantMessage: "Prep list: sugo, impasto pizza.",
  toolsUsed: ["get_operational_briefing"],
  aiDecisions: [{ domain: "food_cost", confidence: 0.8 }],
  metadata: {},
  createdAt: "2026-06-26T10:00:00.000Z",
  ...overrides,
});

describe("memory history", () => {
  it("converts turns to chronological messages", () => {
    const turns = [
      sampleTurn({ id: "t2", userMessage: "secondo", createdAt: "2026-06-26T11:00:00.000Z" }),
      sampleTurn({ id: "t1", userMessage: "primo", createdAt: "2026-06-26T10:00:00.000Z" }),
    ];
    const msgs = turnsToHistoryMessages(turns);
    expect(msgs[0].content).toBe("primo");
    expect(msgs[2].content).toBe("secondo");
  });

  it("formats history for prompt with role labels", () => {
    const text = formatHistoryForPrompt([
      { role: "user", content: "Ciao" },
      { role: "assistant", content: "Buongiorno" },
    ]);
    expect(text).toContain("Utente: Ciao");
    expect(text).toContain("Assistente: Buongiorno");
  });

  it("extracts tools and decisions from turns", () => {
    const turns = [
      sampleTurn({ toolsUsed: ["tool_a"] }),
      sampleTurn({ id: "t2", toolsUsed: ["tool_b"], aiDecisions: [{ x: 1 }] }),
    ];
    expect(extractToolsFromTurns(turns)).toEqual(expect.arrayContaining(["tool_a", "tool_b"]));
    expect(extractRecentDecisions(turns, 2)).toHaveLength(2);
  });
});

describe("memory summary", () => {
  it("builds local summary from turns", () => {
    const summary = buildLocalSummary("Prev", [sampleTurn()]);
    expect(summary).toContain("Prev");
    expect(summary).toContain("Cosa devo preparare");
  });
});

describe("memory compression", () => {
  it("compresses long text blocks", () => {
    const long = "a".repeat(100);
    const out = compressTextBlock(long, 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out).toContain("[compresso]");
  });

  it("exports compression threshold constant", () => {
    expect(COMPRESS_AFTER_TURNS).toBeGreaterThan(0);
  });
});

describe("memory context-manager", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("is enabled by default", () => {
    delete process.env.AI_MEMORY_ENABLED;
    expect(isMemoryEnabled()).toBe(true);
  });

  it("can be disabled via env", () => {
    vi.stubEnv("AI_MEMORY_ENABLED", "false");
    expect(isMemoryEnabled()).toBe(false);
  });
});
