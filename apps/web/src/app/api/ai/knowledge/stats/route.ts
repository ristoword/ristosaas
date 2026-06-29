import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { canReadKnowledge, isKnowledgeSuperAdmin } from "@/lib/ai/knowledge/access";
import { getKnowledgeStats } from "@/lib/ai/rag/retrieval";
import { getAiPlatformConfig } from "@/lib/db/repositories/ai-platform-config.repository";
import { knowledgeRepository } from "@/lib/db/repositories/knowledge.repository";
import { aiVectorRepository } from "@/lib/db/repositories/ai-vector.repository";
import { isAiFeatureEnabled } from "@/lib/ai/platform-config.runtime";

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const user = guard.user!;
  if (!canReadKnowledge(user)) return err("Forbidden", 403);

  const superAdmin = isKnowledgeSuperAdmin(user);
  const url = new URL(req.url);
  const tenantId = superAdmin ? url.searchParams.get("tenantId") ?? user.tenantId ?? null : user.tenantId ?? null;

  const [stats, toggles, vectorStats, jobs, audit] = await Promise.all([
    getKnowledgeStats(tenantId, superAdmin),
    getAiPlatformConfig(),
    aiVectorRepository.getStats(),
    knowledgeRepository.listJobs({ tenantId, superAdmin, limit: 20 }),
    knowledgeRepository.listAudit({ tenantId, superAdmin, limit: 30 }),
  ]);

  return ok({
    toggles: {
      ragEnabled: toggles.ragEnabled,
      vectorDbEnabled: toggles.vectorDbEnabled,
      embeddingEnabled: toggles.embeddingEnabled,
      indexingEnabled: toggles.indexingEnabled,
    },
    knowledge: stats,
    vector: vectorStats,
    vectorAvailable: await aiVectorRepository.isAvailable(),
    ragRuntime: await isAiFeatureEnabled("rag"),
    jobs,
    audit,
  });
}
