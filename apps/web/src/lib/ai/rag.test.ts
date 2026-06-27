import { describe, expect, it } from "vitest";
import { EMBEDDING_DIM } from "@/lib/ai/embeddings";
import { hashChunkContent, toPgVector } from "@/lib/db/repositories/ai-vector.repository";
import { buildManualChunks, formatRagContext } from "@/lib/ai/rag";
import { cosineSimilarity } from "@/lib/ai/embeddings";

describe("rag", () => {
  it("buildManualChunks includes manual sections and quick start", () => {
    const chunks = buildManualChunks();
    expect(chunks.length).toBeGreaterThan(20);
    expect(chunks.some((c) => c.sectionId === "magazzino")).toBe(true);
    expect(chunks.some((c) => c.sectionId === "quick-start")).toBe(true);
  });

  it("cosineSimilarity returns 1 for identical vectors", () => {
    const v = [0.1, 0.2, 0.3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });

  it("formatRagContext wraps selected chunks", () => {
    const text = formatRagContext([
      { id: "a", sectionId: "sala", text: "Apri un tavolo dalla planimetria." },
    ]);
    expect(text).toContain("vector search");
    expect(text).toContain("planimetria");
  });
});

describe("ai-vector.repository helpers", () => {
  it("hashChunkContent is stable", () => {
    expect(hashChunkContent("test")).toBe(hashChunkContent("test"));
    expect(hashChunkContent("a")).not.toBe(hashChunkContent("b"));
  });

  it("toPgVector formats pgvector literal", () => {
    const vec = Array.from({ length: EMBEDDING_DIM }, (_, i) => i * 0.001);
    expect(toPgVector(vec)).toMatch(/^\[0,0\.001/);
    expect(() => toPgVector([1, 2, 3])).toThrow();
  });
});
