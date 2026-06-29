import { randomUUID } from "node:crypto";
import { embedTexts, getEmbeddingModel } from "@/lib/ai/embeddings";
import { chunkText } from "@/lib/ai/rag/chunking";
import { collectTenantEntityDocuments } from "@/lib/ai/rag/entity-sync";
import { extractTextFromDocument } from "@/lib/ai/rag/text-extract";
import { KNOWLEDGE_SOURCE } from "@/lib/ai/rag/types";
import type { IndexingProgressEvent } from "@/lib/ai/rag/types";
import { getAiPlatformConfig } from "@/lib/db/repositories/ai-platform-config.repository";
import { hashChunkContent, toPgVector } from "@/lib/db/repositories/ai-vector.repository";
import { knowledgeRepository } from "@/lib/db/repositories/knowledge.repository";
import { prisma } from "@/lib/db/prisma";

export type IndexDocumentResult = {
  documentId: string;
  chunksIndexed: number;
  embeddingsGenerated: number;
  durationMs: number;
};

const globalJobEmitters = globalThis as unknown as {
  ragJobEmitters?: Map<string, (event: IndexingProgressEvent) => void>;
};

function getEmitters() {
  if (!globalJobEmitters.ragJobEmitters) {
    globalJobEmitters.ragJobEmitters = new Map();
  }
  return globalJobEmitters.ragJobEmitters;
}

export function subscribeIndexingJob(jobId: string, listener: (e: IndexingProgressEvent) => void) {
  getEmitters().set(jobId, listener);
  return () => getEmitters().delete(jobId);
}

function emitProgress(jobId: string, event: IndexingProgressEvent) {
  getEmitters().get(jobId)?.(event);
}

async function getChunkConfig() {
  const cfg = await getAiPlatformConfig();
  return {
    chunkSize: cfg.ragChunkSize ?? 800,
    overlap: cfg.ragChunkOverlap ?? 120,
    indexingEnabled: cfg.indexingEnabled !== false,
    embeddingEnabled: cfg.embeddingEnabled !== false,
  };
}

/** Incremental index: remove stale chunks for document, upsert only changed chunks. */
export async function indexKnowledgeDocument(params: {
  documentId: string;
  apiKey: string;
  jobId?: string;
}): Promise<IndexDocumentResult> {
  const started = Date.now();
  const doc = await prisma.aiKnowledgeDocument.findUnique({ where: { id: params.documentId } });
  if (!doc || doc.status === "deleted") throw new Error("Documento non trovato");

  const config = await getChunkConfig();
  if (!config.indexingEnabled) throw new Error("Indicizzazione disabilitata dalla piattaforma");
  if (!config.embeddingEnabled) throw new Error("Embedding disabilitati dalla piattaforma");

  const jobId = params.jobId ?? (await knowledgeRepository.createJob({
    tenantId: doc.tenantId,
    documentId: doc.id,
    jobType: "index_document",
  })).id;

  await knowledgeRepository.updateJob(jobId, {
    status: "running",
    startedAt: new Date(),
    progressPct: 0,
  });
  await prisma.aiKnowledgeDocument.update({
    where: { id: doc.id },
    data: { status: "indexing", lastError: null },
  });

  try {
    const extracted = await extractTextFromDocument({
      mimeType: doc.mimeType,
      contentText: doc.contentText,
      contentBase64: doc.contentBase64,
      fileName: doc.fileName,
    });

    const chunks = chunkText(extracted.text, {
      chunkSize: config.chunkSize,
      overlap: config.overlap,
      sectionId: doc.module,
    });

    await knowledgeRepository.updateJob(jobId, {
      chunksTotal: chunks.length,
      progressPct: chunks.length === 0 ? 100 : 5,
    });
    emitProgress(jobId, {
      type: "progress",
      jobId,
      progressPct: 5,
      chunksDone: 0,
      chunksTotal: chunks.length,
      message: "Chunking completato",
    });

    const existing = await prisma.$queryRaw<Array<{ chunkKey: string; contentHash: string }>>`
      SELECT "chunkKey", "contentHash" FROM "AiVectorChunk"
      WHERE "documentId" = ${doc.id} AND source = ${KNOWLEDGE_SOURCE}
    `;
    const existingMap = new Map(existing.map((r) => [r.chunkKey, r.contentHash]));
    const newKeys = new Set<string>();

    const toEmbed: typeof chunks = [];
    for (const chunk of chunks) {
      const chunkKey = `${doc.tenantId ?? "platform"}:${doc.id}:${chunk.chunkIndex}`;
      newKeys.add(chunkKey);
      const contentHash = hashChunkContent(chunk.text);
      if (existingMap.get(chunkKey) !== contentHash) {
        toEmbed.push(chunk);
      }
    }

    const staleKeys = [...existingMap.keys()].filter((k) => !newKeys.has(k));
    if (staleKeys.length > 0) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "AiVectorChunk" WHERE "documentId" = $1 AND "chunkKey" = ANY($2::text[])`,
        doc.id,
        staleKeys,
      );
    }

    const embeddingModel = getEmbeddingModel();
    let embeddingsDone = 0;
    const batchSize = 20;

    for (let i = 0; i < toEmbed.length; i += batchSize) {
      const batch = toEmbed.slice(i, i + batchSize);
      const embedStarted = Date.now();
      const vectors = await embedTexts(
        params.apiKey,
        batch.map((c) => c.text),
      );
      const embedMs = Date.now() - embedStarted;

      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const chunkKey = `${doc.tenantId ?? "platform"}:${doc.id}:${chunk.chunkIndex}`;
        const contentHash = hashChunkContent(chunk.text);
        const vectorLiteral = toPgVector(vectors[j]);

        await prisma.$executeRawUnsafe(
          `INSERT INTO "AiVectorChunk" (
            id, source, "chunkKey", "sectionId", content, "embeddingModel", "contentHash", embedding,
            "tenantId", "documentId", module, category, language, "authorId", "authorName",
            "documentVersion", "chunkIndex", metadata, "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8::vector,
            $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb, NOW()
          )
          ON CONFLICT (source, "chunkKey") DO UPDATE SET
            "sectionId" = EXCLUDED."sectionId",
            content = EXCLUDED.content,
            "embeddingModel" = EXCLUDED."embeddingModel",
            "contentHash" = EXCLUDED."contentHash",
            embedding = EXCLUDED.embedding,
            module = EXCLUDED.module,
            category = EXCLUDED.category,
            language = EXCLUDED.language,
            "documentVersion" = EXCLUDED."documentVersion",
            "chunkIndex" = EXCLUDED."chunkIndex",
            metadata = EXCLUDED.metadata,
            "updatedAt" = NOW()`,
          randomUUID(),
          KNOWLEDGE_SOURCE,
          chunkKey,
          chunk.sectionId,
          chunk.text,
          embeddingModel,
          contentHash,
          vectorLiteral,
          doc.tenantId,
          doc.id,
          doc.module,
          doc.category,
          doc.language,
          doc.authorId,
          doc.authorName,
          doc.version,
          chunk.chunkIndex,
          JSON.stringify({
            ...(chunk.metadata ?? {}),
            documentTitle: doc.title,
            sourceKind: doc.sourceKind,
          }),
        );
        embeddingsDone++;
      }

      const done = Math.min(chunks.length, i + batch.length);
      const pct = chunks.length === 0 ? 100 : Math.round(5 + (done / chunks.length) * 90);
      await knowledgeRepository.updateJob(jobId, {
        chunksDone: done,
        embeddingsDone,
        progressPct: pct,
      });
      emitProgress(jobId, {
        type: "progress",
        jobId,
        progressPct: pct,
        chunksDone: done,
        chunksTotal: chunks.length,
      });

      const cfg = await getAiPlatformConfig();
      const prevAvg = cfg.ragAvgEmbedMs ?? embedMs;
      await prisma.aiPlatformConfig.update({
        where: { id: "default" },
        data: { ragAvgEmbedMs: (prevAvg + embedMs) / 2 },
      });
    }

    await prisma.aiKnowledgeDocument.update({
      where: { id: doc.id },
      data: {
        status: "indexed",
        chunkCount: chunks.length,
        contentHash: extracted.contentHash,
        contentText: extracted.text,
        lastIndexedAt: new Date(),
        lastError: null,
      },
    });

    await knowledgeRepository.updateJob(jobId, {
      status: "completed",
      progressPct: 100,
      chunksDone: chunks.length,
      embeddingsDone,
      completedAt: new Date(),
    });

    emitProgress(jobId, {
      type: "done",
      jobId,
      progressPct: 100,
      chunksDone: chunks.length,
      chunksTotal: chunks.length,
    });

    return {
      documentId: doc.id,
      chunksIndexed: chunks.length,
      embeddingsGenerated: embeddingsDone,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.aiKnowledgeDocument.update({
      where: { id: doc.id },
      data: { status: "error", lastError: message },
    });
    await knowledgeRepository.updateJob(jobId, {
      status: "failed",
      errorMessage: message,
      completedAt: new Date(),
    });
    emitProgress(jobId, { type: "error", jobId, progressPct: 0, chunksDone: 0, chunksTotal: 0, message });
    throw error;
  }
}

export async function syncTenantEntities(params: {
  tenantId: string;
  apiKey: string;
  jobId?: string;
}): Promise<{ synced: number; indexed: number }> {
  const job = params.jobId
    ? await knowledgeRepository.getJob(params.jobId)
    : await knowledgeRepository.createJob({
        tenantId: params.tenantId,
        jobType: "entity_sync",
      });
  const jobId = job!.id;

  const entities = await collectTenantEntityDocuments(params.tenantId);
  let synced = 0;
  let indexed = 0;

  for (const entity of entities) {
    const { document, changed } = await knowledgeRepository.upsertEntityDocument({
      tenantId: params.tenantId,
      module: entity.module,
      category: entity.category,
      sourceEntity: entity.sourceEntity,
      sourceEntityId: entity.sourceEntityId,
      title: entity.title,
      contentText: entity.text,
      contentHash: hashChunkContent(entity.text),
      language: entity.language,
      metadata: entity.metadata,
    });
    synced++;
    if (changed) {
      await indexKnowledgeDocument({ documentId: document.id, apiKey: params.apiKey, jobId });
      indexed++;
    }
  }

  await knowledgeRepository.updateJob(jobId, {
    status: "completed",
    progressPct: 100,
    completedAt: new Date(),
    metadata: { synced, indexed },
  });

  return { synced, indexed };
}

export async function reindexAllKnowledge(params: {
  tenantId?: string | null;
  apiKey: string;
  jobId?: string;
}): Promise<{ documents: number; chunks: number }> {
  const where = params.tenantId
    ? { tenantId: params.tenantId, status: { not: "deleted" as const } }
    : { status: { not: "deleted" as const } };

  const docs = await prisma.aiKnowledgeDocument.findMany({ where, select: { id: true } });
  let chunks = 0;
  for (const doc of docs) {
    const result = await indexKnowledgeDocument({ documentId: doc.id, apiKey: params.apiKey });
    chunks += result.chunksIndexed;
  }
  return { documents: docs.length, chunks };
}
