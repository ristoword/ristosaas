import { describe, expect, it } from "vitest";
import {
  EMBEDDING_DIM,
  cosineSimilarity,
  getEmbeddingModel,
  validateEmbedding,
} from "@/lib/ai/embeddings";

describe("embeddings", () => {
  it("getEmbeddingModel defaults to text-embedding-3-small", () => {
    expect(getEmbeddingModel()).toBe("text-embedding-3-small");
  });

  it("validateEmbedding accepts correct dimension", () => {
    const vec = Array.from({ length: EMBEDDING_DIM }, () => 0.01);
    expect(() => validateEmbedding(vec)).not.toThrow();
  });

  it("validateEmbedding rejects wrong dimension", () => {
    expect(() => validateEmbedding([1, 2, 3])).toThrow(/1536/);
  });

  it("cosineSimilarity returns 1 for identical vectors", () => {
    const v = [0.1, 0.2, 0.3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });
});
