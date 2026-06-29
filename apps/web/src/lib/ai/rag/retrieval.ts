import { buildManualChunks, formatRagContext, retrieveManualContext } from "@/lib/ai/rag";
import { embedTexts } from "@/lib/ai/embeddings";
import { KNOWLEDGE_SOURCE, MANUAL_SOURCE } from "@/lib/ai/rag/types";
import type { KnowledgeSearchFilters, KnowledgeSearchHit } from "@/lib/ai/rag/types";
import { getAiPlatformConfig } from "@/lib/db/repositories/ai-platform-config.repository";
import { aiVectorRepository, toPgVector } from "@/lib/db/repositories/ai-vector.repository";
import { prisma } from "@/lib/db/prisma";
import { isAiFeatureEnabled, isRagRuntimeEnabled } from "@/lib/ai/platform-config.runtime";

const retrievalCache = globalThis as unknown as {
  ragQueryCache?: Map<string, { at: number; context: string }>;
};

function cacheKey(query: string, tenantId: string | null, modules?: string[]): string {
  return `${tenantId ?? "platform"}:${(modules ?? []).join(",")}:${query.toLowerCase().trim()}`;
}

function selectByScore<T extends { score: number }>(scored: T[], topK: number, minScore: number): T[] {
  const selected = scored.filter((s) => s.score >= minScore).slice(0, topK);
  if (selected.length > 0) return selected;
  const fallback = scored.slice(0, Math.min(2, topK));
  if (fallback.length === 0 || fallback[0].score < 0.2) return [];
  return fallback;
}

export async function searchKnowledgeVectors(params: {
  queryEmbedding: number[];
  topK: number;
  minScore: number;
  filters: KnowledgeSearchFilters;
}): Promise<KnowledgeSearchHit[]> {
  if (!(await aiVectorRepository.isAvailable())) return [];

  const vectorLiteral = toPgVector(params.queryEmbedding);
  const conditions: string[] = [];
  const values: unknown[] = [vectorLiteral];
  let paramIdx = 2;

  if (params.filters.tenantId) {
    conditions.push(`("tenantId" = $${paramIdx} OR "tenantId" IS NULL)`);
    values.push(params.filters.tenantId);
    paramIdx++;
  }

  if (params.filters.modules?.length) {
    conditions.push(`(module = ANY($${paramIdx}::text[]) OR module IS NULL)`);
    values.push(params.filters.modules);
    paramIdx++;
  }

  if (params.filters.categories?.length) {
    conditions.push(`category = ANY($${paramIdx}::text[])`);
    values.push(params.filters.categories);
    paramIdx++;
  }

  if (params.filters.language) {
    conditions.push(`language = $${paramIdx}`);
    values.push(params.filters.language);
    paramIdx++;
  }

  if (params.filters.documentIds?.length) {
    conditions.push(`"documentId" = ANY($${paramIdx}::text[])`);
    values.push(params.filters.documentIds);
    paramIdx++;
  }

  if (!params.filters.includePlatformManual) {
    conditions.push(`source = $${paramIdx}`);
    values.push(KNOWLEDGE_SOURCE);
    paramIdx++;
  } else {
    conditions.push(`source IN ($${paramIdx}, $${paramIdx + 1})`);
    values.push(KNOWLEDGE_SOURCE, MANUAL_SOURCE);
    paramIdx += 2;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  values.push(params.topK + 3);

  const started = Date.now();
  const rows = await prisma.$queryRawUnsafe<KnowledgeSearchHit[]>(
    `SELECT
       "chunkKey",
       "sectionId",
       content,
       1 - (embedding <=> $1::vector) AS score,
       "tenantId",
       "documentId",
       module,
       category,
       language,
       metadata
     FROM "AiVectorChunk"
     ${whereClause}
     ORDER BY embedding <=> $1::vector
     LIMIT $${paramIdx}`,
    ...values,
  );

  const searchMs = Date.now() - started;
  const cfg = await getAiPlatformConfig();
  await prisma.aiPlatformConfig.update({
    where: { id: "default" },
    data: {
      ragQueryCount: { increment: 1 },
      ragAvgSearchMs: cfg.ragAvgSearchMs != null ? (cfg.ragAvgSearchMs + searchMs) / 2 : searchMs,
    },
  });

  return rows.map((r) => ({
    ...r,
    score: Number(r.score),
    metadata: typeof r.metadata === "object" && r.metadata ? (r.metadata as Record<string, unknown>) : {},
    documentTitle:
      typeof r.metadata === "object" && r.metadata && "documentTitle" in (r.metadata as object)
        ? String((r.metadata as Record<string, unknown>).documentTitle)
        : null,
  }));
}

export function formatKnowledgeContext(hits: KnowledgeSearchHit[]): string {
  if (hits.length === 0) return "";
  const body = hits
    .map((h) => {
      const title = h.documentTitle ? `[${h.documentTitle}] ` : "";
      const mod = h.module ? `(${h.module}) ` : "";
      return `${title}${mod}${h.content}`;
    })
    .join("\n\n---\n\n");

  return [
    "Knowledge Base RistoSimply (RAG enterprise — documenti tenant + manuale piattaforma):",
    body,
    "Usa questi estratti come contesto autorevole. Per dati live (stock, ordini, incassi) usa i dati operativi nel prompt.",
  ].join("\n\n");
}

/**
 * Unified retrieval: platform manual + tenant knowledge base.
 * Estende retrieveManualContext senza sostituirlo.
 */
export async function retrieveKnowledgeContext(
  query: string,
  apiKey: string,
  options?: {
    tenantId?: string | null;
    modules?: string[];
    topK?: number;
    minScore?: number;
    useCache?: boolean;
  },
): Promise<string | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  if (!(await isRagRuntimeEnabled())) return null;

  const cfg = await getAiPlatformConfig();
  const topK = options?.topK ?? Number(process.env.RAG_TOP_K || 4);
  const minScore = options?.minScore ?? cfg.ragSearchThreshold ?? Number(process.env.RAG_MIN_SCORE || 0.32);
  const tenantId = options?.tenantId ?? null;

  const key = cacheKey(trimmed, tenantId, options?.modules);
  if (options?.useCache !== false) {
    const cache = retrievalCache.ragQueryCache ?? new Map();
    retrievalCache.ragQueryCache = cache;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 60_000) {
      await prisma.aiPlatformConfig.update({
        where: { id: "default" },
        data: { ragCacheHits: { increment: 1 } },
      });
      return hit.context;
    }
  }

  try {
    const vectorDbOn = await isAiFeatureEnabled("vectorDb");
    const parts: string[] = [];

    if (vectorDbOn && (await aiVectorRepository.isAvailable())) {
      const [queryEmbedding] = await embedTexts(apiKey, [trimmed]);

      const knowledgeHits = await searchKnowledgeVectors({
        queryEmbedding,
        topK: topK + 2,
        minScore,
        filters: {
          tenantId,
          modules: options?.modules,
          includePlatformManual: true,
        },
      });
      const selectedKnowledge = selectByScore(knowledgeHits, topK, minScore);
      if (selectedKnowledge.length > 0) {
        parts.push(formatKnowledgeContext(selectedKnowledge));
      }
    }

    const manualContext = await retrieveManualContext(trimmed, apiKey, { topK, minScore });
    if (manualContext && !parts.some((p) => p.includes(manualContext.slice(0, 80)))) {
      parts.push(manualContext);
    }

    if (parts.length === 0) return null;
    const context = parts.join("\n\n==========\n\n");

    if (options?.useCache !== false) {
      const cache = retrievalCache.ragQueryCache ?? new Map();
      retrievalCache.ragQueryCache = cache;
      cache.set(key, { at: Date.now(), context });
      if (cache.size > 500) {
        const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 100);
        for (const [k] of oldest) cache.delete(k);
      }
    }

    return context;
  } catch {
    return retrieveManualContext(trimmed, apiKey, options);
  }
}

export async function getKnowledgeStats(tenantId?: string | null, superAdmin = false) {
  const docWhere = superAdmin
    ? { status: { not: "deleted" as const }, ...(tenantId ? { tenantId } : {}) }
    : { tenantId: tenantId ?? "__none__", status: { not: "deleted" as const } };

  const [docCount, indexedCount, jobStats, cfg, vectorStats] = await Promise.all([
    prisma.aiKnowledgeDocument.count({ where: docWhere }),
    prisma.aiKnowledgeDocument.count({ where: { ...docWhere, status: "indexed" } }),
    prisma.aiKnowledgeIndexJob.count({
      where: superAdmin ? (tenantId ? { tenantId } : {}) : { tenantId: tenantId ?? "__none__" },
    }),
    getAiPlatformConfig(),
    aiVectorRepository.getStats(),
  ]);

  let chunkCount = 0;
  let bytes = 0;
  if (tenantId) {
    const row = await prisma.$queryRaw<Array<{ chunks: bigint; bytes: bigint }>>`
      SELECT COUNT(*)::bigint AS chunks, COALESCE(SUM(octet_length(content)),0)::bigint AS bytes
      FROM "AiVectorChunk" WHERE source = ${KNOWLEDGE_SOURCE} AND "tenantId" = ${tenantId}
    `;
    chunkCount = Number(row[0]?.chunks ?? 0);
    bytes = Number(row[0]?.bytes ?? 0);
  } else if (superAdmin) {
    const row = await prisma.$queryRaw<Array<{ chunks: bigint; bytes: bigint }>>`
      SELECT COUNT(*)::bigint AS chunks, COALESCE(SUM(octet_length(content)),0)::bigint AS bytes
      FROM "AiVectorChunk" WHERE source = ${KNOWLEDGE_SOURCE}
    `;
    chunkCount = Number(row[0]?.chunks ?? 0);
    bytes = Number(row[0]?.bytes ?? 0);
  }

  return {
    documents: docCount,
    documentsIndexed: indexedCount,
    chunks: chunkCount,
    embeddingCount: chunkCount + vectorStats.chunkCount,
    indexBytes: bytes + vectorStats.totalBytes,
    indexJobs: jobStats,
    hnswIndexed: vectorStats.hnswIndexed,
    pgvectorVersion: vectorStats.pgvectorVersion,
    ragQueryCount: Number(cfg.ragQueryCount ?? 0),
    ragCacheHits: Number(cfg.ragCacheHits ?? 0),
    ragAvgSearchMs: cfg.ragAvgSearchMs ?? vectorStats.avgSearchMs,
    ragAvgEmbedMs: cfg.ragAvgEmbedMs,
    ragLastSyncAt: cfg.ragLastSyncAt,
    ragLastError: cfg.ragLastError,
  };
}
