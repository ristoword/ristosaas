import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { canReadKnowledge, isKnowledgeSuperAdmin } from "@/lib/ai/knowledge/access";
import { embedTexts } from "@/lib/ai/embeddings";
import { formatKnowledgeContext, searchKnowledgeVectors } from "@/lib/ai/rag/retrieval";
import { getAiPlatformConfig } from "@/lib/db/repositories/ai-platform-config.repository";
import { isRagRuntimeEnabled } from "@/lib/ai/platform-config.runtime";

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const user = guard.user!;
  if (!canReadKnowledge(user)) return err("Forbidden", 403);

  if (!(await isRagRuntimeEnabled())) return err("RAG disabilitato", 503);

  const payload = await body<{
    query?: string;
    modules?: string[];
    categories?: string[];
    language?: string;
    topK?: number;
    minScore?: number;
    tenantId?: string;
  }>(req);

  const query = payload?.query?.trim();
  if (!query) return err("query required", 400);

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return err("OPENAI_API_KEY required", 503);

  const superAdmin = isKnowledgeSuperAdmin(user);
  const tenantId = superAdmin ? payload.tenantId ?? user.tenantId ?? null : user.tenantId ?? null;
  const cfg = await getAiPlatformConfig();
  const topK = payload.topK ?? 6;
  const minScore = payload.minScore ?? cfg.ragSearchThreshold ?? 0.32;

  const [queryEmbedding] = await embedTexts(apiKey, [query]);
  const hits = await searchKnowledgeVectors({
    queryEmbedding,
    topK,
    minScore,
    filters: {
      tenantId,
      modules: payload.modules,
      categories: payload.categories,
      language: payload.language,
      includePlatformManual: true,
    },
  });

  return ok({
    hits,
    context: formatKnowledgeContext(hits),
    meta: { topK, minScore, tenantId },
  });
}
