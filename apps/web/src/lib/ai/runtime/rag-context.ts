import { embedTexts } from "@/lib/ai/embeddings";
import { retrieveKnowledgeContext, searchKnowledgeVectors } from "@/lib/ai/rag/retrieval";
import { moduleToKnowledgeModules } from "@/lib/ai/rag/module-map";
import { isAiFeatureEnabled } from "@/lib/ai/platform-config.runtime";
import { aiVectorRepository } from "@/lib/db/repositories/ai-vector.repository";
import { getAiPlatformConfig } from "@/lib/db/repositories/ai-platform-config.repository";
import type { RagContextResult } from "@/lib/ai/runtime/types";

export async function retrieveAgentRagContext(params: {
  query: string;
  apiKey: string;
  tenantId: string;
  module: string;
  ragEnabled: boolean;
  vectorEnabled: boolean;
}): Promise<RagContextResult> {
  if (!params.ragEnabled || !params.query.trim()) {
    return { context: null, documentCount: 0, used: false };
  }

  const context = await retrieveKnowledgeContext(params.query, params.apiKey, {
    tenantId: params.tenantId,
    modules: moduleToKnowledgeModules(params.module),
  });

  let documentCount = 0;
  if (context) {
    try {
      if (params.vectorEnabled && (await isAiFeatureEnabled("vectorDb")) && (await aiVectorRepository.isAvailable())) {
        const cfg = await getAiPlatformConfig();
        const topK = Number(process.env.RAG_TOP_K || 4);
        const minScore = cfg.ragSearchThreshold ?? Number(process.env.RAG_MIN_SCORE || 0.32);
        const [queryEmbedding] = await embedTexts(params.apiKey, [params.query.trim()]);
        const hits = await searchKnowledgeVectors({
          queryEmbedding,
          topK: topK + 2,
          minScore,
          filters: {
            tenantId: params.tenantId,
            modules: moduleToKnowledgeModules(params.module),
            includePlatformManual: true,
          },
        });
        documentCount = new Set(hits.map((h) => h.documentId).filter(Boolean)).size || hits.length;
      } else {
        documentCount = (context.match(/---/g)?.length ?? 0) + 1;
      }
    } catch {
      documentCount = context ? 1 : 0;
    }
  }

  return {
    context,
    documentCount,
    used: Boolean(context),
  };
}
