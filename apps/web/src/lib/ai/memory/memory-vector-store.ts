import { createHash, randomUUID } from "node:crypto";
import { embedText, getEmbeddingModel } from "@/lib/ai/embeddings";
import { hashChunkContent, toPgVector } from "@/lib/db/repositories/ai-vector.repository";
import { prisma } from "@/lib/db/prisma";

export type MemoryVectorHit = {
  memoryKey: string;
  content: string;
  score: number;
  turnId: string | null;
};

async function pgVectorReady(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    const table = await prisma.$queryRaw<Array<{ reg: string | null }>>`
      SELECT to_regclass('public."AiMemoryVector"')::text AS reg
    `;
    return rows.length > 0 && Boolean(table[0]?.reg);
  } catch {
    return false;
  }
}

export const memoryVectorStore = {
  async isAvailable(): Promise<boolean> {
    return pgVectorReady();
  },

  memoryKey(tenantId: string, userId: string, turnId: string): string {
    return createHash("sha256").update(`${tenantId}:${userId}:${turnId}`).digest("hex").slice(0, 32);
  },

  async upsertTurnEmbedding(params: {
    tenantId: string;
    userId: string;
    turnId: string;
    content: string;
    apiKey: string;
  }): Promise<void> {
    if (!(await this.isAvailable())) return;

    const trimmed = params.content.trim().slice(0, 4000);
    if (!trimmed) return;

    const memoryKey = this.memoryKey(params.tenantId, params.userId, params.turnId);
    const contentHash = hashChunkContent(trimmed);
    const embeddingModel = getEmbeddingModel();
    const vector = await embedText(params.apiKey, trimmed);
    const vectorLiteral = toPgVector(vector);

    await prisma.$executeRawUnsafe(
      `INSERT INTO "AiMemoryVector" (
        id, "tenantId", "userId", "memoryKey", "turnId", content, "embeddingModel", "contentHash", embedding, "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector, NOW())
      ON CONFLICT ("tenantId", "userId", "memoryKey") DO UPDATE SET
        content = EXCLUDED.content,
        "embeddingModel" = EXCLUDED."embeddingModel",
        "contentHash" = EXCLUDED."contentHash",
        embedding = EXCLUDED.embedding,
        "updatedAt" = NOW()`,
      randomUUID(),
      params.tenantId,
      params.userId,
      memoryKey,
      params.turnId,
      trimmed,
      embeddingModel,
      contentHash,
      vectorLiteral,
    );
  },

  async search(params: {
    tenantId: string;
    userId: string;
    queryEmbedding: number[];
    topK?: number;
    minScore?: number;
  }): Promise<MemoryVectorHit[]> {
    if (!(await this.isAvailable())) return [];

    const topK = params.topK ?? 5;
    const minScore = params.minScore ?? 0.35;
    const vectorLiteral = toPgVector(params.queryEmbedding);

    const rows = await prisma.$queryRawUnsafe<MemoryVectorHit[]>(
      `SELECT
         "memoryKey",
         content,
         "turnId",
         1 - (embedding <=> $1::vector) AS score
       FROM "AiMemoryVector"
       WHERE "tenantId" = $2 AND "userId" = $3
       ORDER BY embedding <=> $1::vector
       LIMIT $4`,
      vectorLiteral,
      params.tenantId,
      params.userId,
      topK,
    );

    return rows
      .map((r) => ({ ...r, score: Number(r.score) }))
      .filter((r) => r.score >= minScore);
  },
};
