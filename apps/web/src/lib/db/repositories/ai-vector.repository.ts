import { createHash, randomUUID } from "node:crypto";
import { EMBEDDING_DIM } from "@/lib/ai/embeddings";
import { prisma } from "@/lib/db/prisma";
import type { RagChunk } from "@/lib/ai/rag";

export type VectorSearchHit = {
  chunkKey: string;
  sectionId: string;
  content: string;
  score: number;
};

const MANUAL_SOURCE = "manual";

const globalForVector = globalThis as unknown as {
  manualVectorSync?: Promise<void>;
  pgVectorReady?: boolean;
  lastSearchMs?: number;
};

export function hashChunkContent(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function toPgVector(values: number[]): string {
  if (values.length !== EMBEDDING_DIM) {
    throw new Error(`Expected ${EMBEDDING_DIM} dimensions, got ${values.length}`);
  }
  return `[${values.join(",")}]`;
}

async function pgVectorEnabled(): Promise<boolean> {
  if (globalForVector.pgVectorReady === true) return true;
  if (globalForVector.pgVectorReady === false) return false;
  try {
    const rows = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    globalForVector.pgVectorReady = rows.length > 0;
    return globalForVector.pgVectorReady;
  } catch {
    globalForVector.pgVectorReady = false;
    return false;
  }
}

async function tableReady(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<Array<{ reg: string | null }>>`
      SELECT to_regclass('public."AiVectorChunk"') AS reg
    `;
    return Boolean(rows[0]?.reg);
  } catch {
    return false;
  }
}

export const aiVectorRepository = {
  async isAvailable(): Promise<boolean> {
    return (await pgVectorEnabled()) && (await tableReady());
  },

  /**
   * Upsert only changed manual chunks (content hash). Embeds via callback when needed.
   */
  async syncManualChunks(
    chunks: RagChunk[],
    embeddingModel: string,
    embedTexts: (texts: string[]) => Promise<number[][]>,
  ): Promise<void> {
    if (!(await this.isAvailable())) return;

    const existing = await prisma.$queryRaw<Array<{ chunkKey: string; contentHash: string }>>`
      SELECT "chunkKey", "contentHash" FROM "AiVectorChunk" WHERE source = ${MANUAL_SOURCE}
    `;
    const existingByKey = new Map(existing.map((r) => [r.chunkKey, r.contentHash]));
    const currentKeys = new Set(chunks.map((c) => c.id));

    const toUpsert: RagChunk[] = [];
    for (const chunk of chunks) {
      if (existingByKey.get(chunk.id) !== hashChunkContent(chunk.text)) {
        toUpsert.push(chunk);
      }
    }

    const staleKeys = [...existingByKey.keys()].filter((k) => !currentKeys.has(k));

    if (toUpsert.length === 0 && staleKeys.length === 0) return;

    const embeddings =
      toUpsert.length > 0 ? await embedTexts(toUpsert.map((c) => c.text)) : [];

    for (let i = 0; i < toUpsert.length; i++) {
      const chunk = toUpsert[i];
      const embedding = embeddings[i];
      const contentHash = hashChunkContent(chunk.text);
      const vectorLiteral = toPgVector(embedding);

      await prisma.$executeRawUnsafe(
        `INSERT INTO "AiVectorChunk" (
          id, source, "chunkKey", "sectionId", content, "embeddingModel", "contentHash", embedding, "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, NOW())
        ON CONFLICT (source, "chunkKey") DO UPDATE SET
          "sectionId" = EXCLUDED."sectionId",
          content = EXCLUDED.content,
          "embeddingModel" = EXCLUDED."embeddingModel",
          "contentHash" = EXCLUDED."contentHash",
          embedding = EXCLUDED.embedding,
          "updatedAt" = NOW()`,
        randomUUID(),
        MANUAL_SOURCE,
        chunk.id,
        chunk.sectionId,
        chunk.text,
        embeddingModel,
        contentHash,
        vectorLiteral,
      );
    }

    if (staleKeys.length > 0) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "AiVectorChunk" WHERE source = $1 AND "chunkKey" = ANY($2::text[])`,
        MANUAL_SOURCE,
        staleKeys,
      );
    }
  },

  async ensureManualSynced(
    chunks: RagChunk[],
    embeddingModel: string,
    embedTexts: (texts: string[]) => Promise<number[][]>,
  ): Promise<void> {
    if (!(await this.isAvailable())) return;
    if (!globalForVector.manualVectorSync) {
      globalForVector.manualVectorSync = this.syncManualChunks(chunks, embeddingModel, embedTexts).finally(() => {
        globalForVector.manualVectorSync = undefined;
      });
    }
    await globalForVector.manualVectorSync;
  },

  async searchManual(queryEmbedding: number[], topK: number): Promise<VectorSearchHit[]> {
    if (!(await this.isAvailable())) return [];

    const started = Date.now();
    const vectorLiteral = toPgVector(queryEmbedding);
    const rows = await prisma.$queryRawUnsafe<VectorSearchHit[]>(
      `SELECT
         "chunkKey",
         "sectionId",
         content,
         1 - (embedding <=> $1::vector) AS score
       FROM "AiVectorChunk"
       WHERE source = $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      vectorLiteral,
      MANUAL_SOURCE,
      topK,
    );

    globalForVector.lastSearchMs = Date.now() - started;

    return rows.map((r) => ({
      chunkKey: r.chunkKey,
      sectionId: r.sectionId,
      content: r.content,
      score: Number(r.score),
    }));
  },

  async getStats(): Promise<{
    chunkCount: number;
    sourceCount: number;
    totalBytes: number;
    lastUpdated: string | null;
    avgSearchMs: number | null;
  }> {
    if (!(await this.isAvailable())) {
      return { chunkCount: 0, sourceCount: 0, totalBytes: 0, lastUpdated: null, avgSearchMs: null };
    }

    const [countRow, sizeRow, lastRow] = await Promise.all([
      prisma.$queryRaw<Array<{ cnt: bigint; sources: bigint }>>`
        SELECT COUNT(*)::bigint AS cnt, COUNT(DISTINCT source)::bigint AS sources
        FROM "AiVectorChunk"
      `,
      prisma.$queryRaw<Array<{ bytes: bigint | null }>>`
        SELECT COALESCE(SUM(octet_length(content)), 0)::bigint AS bytes FROM "AiVectorChunk"
      `,
      prisma.$queryRaw<Array<{ updated: Date | null }>>`
        SELECT MAX("updatedAt") AS updated FROM "AiVectorChunk"
      `,
    ]);

    return {
      chunkCount: Number(countRow[0]?.cnt ?? 0),
      sourceCount: Number(countRow[0]?.sources ?? 0),
      totalBytes: Number(sizeRow[0]?.bytes ?? 0),
      lastUpdated: lastRow[0]?.updated?.toISOString() ?? null,
      avgSearchMs: globalForVector.lastSearchMs ?? null,
    };
  },

  async clearManualIndex(): Promise<number> {
    if (!(await tableReady())) return 0;
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "AiVectorChunk" WHERE source = $1`,
      MANUAL_SOURCE,
    );
    globalForVector.manualVectorSync = undefined;
    return typeof result === "number" ? result : 0;
  },

  async forceReindex(
    chunks: RagChunk[],
    embeddingModel: string,
    embedTexts: (texts: string[]) => Promise<number[][]>,
  ): Promise<{ upserted: number; removed: number }> {
    if (!(await this.isAvailable())) throw new Error("Vector DB non disponibile");
    globalForVector.manualVectorSync = undefined;
    const existing = await prisma.$queryRaw<Array<{ chunkKey: string }>>`
      SELECT "chunkKey" FROM "AiVectorChunk" WHERE source = ${MANUAL_SOURCE}
    `;
    const before = existing.length;
    await this.syncManualChunks(chunks, embeddingModel, embedTexts);
    const after = await prisma.aiVectorChunk.count({ where: { source: MANUAL_SOURCE } });
    return { upserted: after, removed: Math.max(0, before - after) };
  },
};
