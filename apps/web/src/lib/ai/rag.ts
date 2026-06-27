import { QUICK_START, ROLE_GUIDE, SECTIONS } from "@/lib/manuale/sections";
import { aiVectorRepository } from "@/lib/db/repositories/ai-vector.repository";
import {
  cosineSimilarity,
  embedTexts,
  getEmbeddingModel,
} from "@/lib/ai/embeddings";

export { embedTexts, cosineSimilarity } from "@/lib/ai/embeddings";

export type RagChunk = {
  id: string;
  sectionId: string;
  text: string;
};

type RagIndex = {
  chunks: RagChunk[];
  embeddings: number[][];
};

const globalForRag = globalThis as unknown as {
  manualRagIndex?: Promise<RagIndex>;
};

const DEFAULT_TOP_K = 4;
const DEFAULT_MIN_SCORE = 0.32;

/** Flatten manual sections into searchable text chunks (single source: manuale utente). */
export function buildManualChunks(): RagChunk[] {
  const chunks: RagChunk[] = [];

  for (const section of SECTIONS) {
    for (let i = 0; i < section.content.length; i++) {
      const block = section.content[i];
      const tips = block.tips?.length ? `\nConsigli:\n- ${block.tips.join("\n- ")}` : "";
      chunks.push({
        id: `${section.id}:${i}`,
        sectionId: section.id,
        text: [
          `[${section.title}] ${block.heading}`,
          section.subtitle,
          `Ruoli: ${section.roles.join(", ")}`,
          block.body,
          tips,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    }
  }

  for (const step of QUICK_START) {
    chunks.push({
      id: `quick-start:${step.step}`,
      sectionId: "quick-start",
      text: `Guida rapida — passo ${step.step}: ${step.title}\n${step.desc}`,
    });
  }

  for (const role of ROLE_GUIDE) {
    chunks.push({
      id: `role:${role.role}`,
      sectionId: "roles",
      text: `Ruolo ${role.role}: pagine accessibili — ${role.pages}`,
    });
  }

  return chunks;
}

async function ensureInMemoryIndex(apiKey: string): Promise<RagIndex> {
  if (!globalForRag.manualRagIndex) {
    globalForRag.manualRagIndex = (async () => {
      const chunks = buildManualChunks();
      const embeddings = await embedTexts(
        apiKey,
        chunks.map((c) => c.text),
      );
      return { chunks, embeddings };
    })();
  }
  return globalForRag.manualRagIndex;
}

function hitsToChunks(hits: Array<{ chunkKey: string; sectionId: string; content: string }>): RagChunk[] {
  return hits.map((h) => ({
    id: h.chunkKey,
    sectionId: h.sectionId,
    text: h.content,
  }));
}

function selectByScore<T extends { score: number }>(
  scored: T[],
  topK: number,
  minScore: number,
): T[] {
  const selected = scored.filter((s) => s.score >= minScore).slice(0, topK);
  if (selected.length > 0) return selected;
  const fallback = scored.slice(0, Math.min(2, topK));
  if (fallback.length === 0 || fallback[0].score < 0.2) return [];
  return fallback;
}

export function formatRagContext(chunks: RagChunk[]): string {
  if (chunks.length === 0) return "";
  const body = chunks.map((c) => c.text).join("\n\n---\n\n");
  return [
    "Documentazione RistoSimply (RAG — estratti dal manuale utente via vector search; usa questi contenuti per spiegare funzioni e procedure del gestionale):",
    body,
    "Se la domanda riguarda come usare il software, basati su questi estratti. Per dati operativi live (stock, ordini, incassi) usa invece i dati reali già forniti nel prompt.",
  ].join("\n\n");
}

/**
 * Retrieve top manual chunks for a user query (pgvector semantic search, in-memory fallback).
 * Returns formatted context for system prompt augmentation, or null on failure.
 */
export async function retrieveManualContext(
  query: string,
  apiKey: string,
  options?: { topK?: number; minScore?: number },
): Promise<string | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const topK = options?.topK ?? Number(process.env.RAG_TOP_K || DEFAULT_TOP_K);
  const minScore = options?.minScore ?? Number(process.env.RAG_MIN_SCORE || DEFAULT_MIN_SCORE);

  try {
    const [queryEmbedding] = await embedTexts(apiKey, [trimmed]);
    const model = getEmbeddingModel();

    if (await aiVectorRepository.isAvailable()) {
      const chunks = buildManualChunks();
      await aiVectorRepository.ensureManualSynced(chunks, model, (texts) => embedTexts(apiKey, texts));

      const hits = await aiVectorRepository.searchManual(queryEmbedding, topK + 2);
      const selected = selectByScore(hits, topK, minScore);
      if (selected.length > 0) {
        return formatRagContext(hitsToChunks(selected));
      }
    }

    const index = await ensureInMemoryIndex(apiKey);
    const scored = index.chunks.map((chunk, i) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, index.embeddings[i]),
    }));
    scored.sort((a, b) => b.score - a.score);

    const selected = selectByScore(scored, topK, minScore);
    if (selected.length === 0) return null;
    return formatRagContext(selected.map((s) => s.chunk));
  } catch {
    return null;
  }
}
