import { describe, expect, it } from "vitest";
import { chunkText, hashDocumentContent } from "@/lib/ai/rag/chunking";

describe("rag chunking", () => {
  it("deduplicates identical chunks", () => {
    const text = "Primo paragrafo lungo.\n\nSecondo paragrafo.\n\nPrimo paragrafo lungo.";
    const chunks = chunkText(text, { chunkSize: 200, overlap: 20 });
    const hashes = chunks.map((c) => hashDocumentContent(c.text));
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it("produces overlap between consecutive chunks for long text", () => {
    const paragraph = "Lorem ipsum dolor sit amet. ".repeat(40);
    const chunks = chunkText(paragraph, { chunkSize: 300, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
  });
});
