import { createHash } from "node:crypto";
import type { KnowledgeChunkInput } from "@/lib/ai/rag/types";

export type ChunkingOptions = {
  chunkSize?: number;
  overlap?: number;
  sectionId?: string;
};

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_OVERLAP = 120;

/** SHA-256 hex digest for deduplication. */
export function hashDocumentContent(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function splitSentences(block: string): string[] {
  const parts = block.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [block];
}

/** Dynamic chunking with overlap and deduplication. */
export function chunkText(text: string, options?: ChunkingOptions): KnowledgeChunkInput[] {
  const chunkSize = Math.max(200, options?.chunkSize ?? DEFAULT_CHUNK_SIZE);
  const overlap = Math.min(Math.max(0, options?.overlap ?? DEFAULT_OVERLAP), Math.floor(chunkSize / 2));
  const sectionId = options?.sectionId ?? "body";
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = splitParagraphs(normalized);
  const rawChunks: string[] = [];
  let buffer = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > chunkSize) {
      if (buffer.trim()) {
        rawChunks.push(buffer.trim());
        buffer = "";
      }
      const sentences = splitSentences(paragraph);
      let sentenceBuf = "";
      for (const sentence of sentences) {
        if ((sentenceBuf + " " + sentence).trim().length > chunkSize && sentenceBuf.trim()) {
          rawChunks.push(sentenceBuf.trim());
          sentenceBuf = sentence;
        } else {
          sentenceBuf = sentenceBuf ? `${sentenceBuf} ${sentence}` : sentence;
        }
      }
      if (sentenceBuf.trim()) rawChunks.push(sentenceBuf.trim());
      continue;
    }

    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (candidate.length > chunkSize && buffer.trim()) {
      rawChunks.push(buffer.trim());
      buffer = paragraph;
    } else {
      buffer = candidate;
    }
  }
  if (buffer.trim()) rawChunks.push(buffer.trim());

  const withOverlap: string[] = [];
  for (let i = 0; i < rawChunks.length; i++) {
    const prevTail = i > 0 && overlap > 0 ? rawChunks[i - 1].slice(-overlap) : "";
    const merged = prevTail ? `${prevTail}\n${rawChunks[i]}` : rawChunks[i];
    withOverlap.push(merged.trim());
  }

  const seen = new Set<string>();
  const chunks: KnowledgeChunkInput[] = [];
  for (let i = 0; i < withOverlap.length; i++) {
    const t = withOverlap[i];
    const h = hashDocumentContent(t);
    if (seen.has(h)) continue;
    seen.add(h);
    chunks.push({
      chunkIndex: chunks.length,
      text: t,
      sectionId,
      metadata: { charCount: t.length, contentHash: h },
    });
  }
  return chunks;
}
