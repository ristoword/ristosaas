import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { canWriteKnowledge, isKnowledgeSuperAdmin } from "@/lib/ai/knowledge/access";
import {
  indexKnowledgeDocument,
  reindexAllKnowledge,
  syncTenantEntities,
} from "@/lib/ai/rag/indexing-service";
import { knowledgeRepository } from "@/lib/db/repositories/knowledge.repository";
import { runRagReindex } from "@/lib/ai/config-center/service";
import { setRagSyncResult } from "@/lib/db/repositories/ai-platform-config.repository";
import { clientIpFromRequest } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const user = guard.user!;
  if (!canWriteKnowledge(user) && user.role !== "super_admin") return err("Forbidden", 403);

  const payload = await body<{
    action?: string;
    documentId?: string;
    tenantId?: string;
  }>(req);
  const action = payload?.action;
  if (!action) return err("action required", 400);

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey && action !== "clear_knowledge") return err("OPENAI_API_KEY required", 503);

  const superAdmin = isKnowledgeSuperAdmin(user);
  const tenantId = superAdmin ? payload.tenantId ?? user.tenantId ?? null : user.tenantId ?? null;

  try {
    if (action === "reindex_document" && payload.documentId) {
      const result = await indexKnowledgeDocument({ documentId: payload.documentId, apiKey: apiKey! });
      void knowledgeRepository.recordAudit({
        tenantId,
        actorId: user.id,
        actorRole: user.role,
        actorEmail: user.email,
        action: "knowledge.reindex_document",
        documentId: payload.documentId,
        ipAddress: clientIpFromRequest(req),
      });
      return ok({ success: true, ...result });
    }

    if (action === "sync_entities" && tenantId) {
      const job = await knowledgeRepository.createJob({
        tenantId,
        jobType: "entity_sync",
        createdBy: user.id,
      });
      const result = await syncTenantEntities({ tenantId, apiKey: apiKey!, jobId: job.id });
      await setRagSyncResult(new Date(), null);
      return ok({ success: true, jobId: job.id, ...result });
    }

    if (action === "reindex_all") {
      const job = await knowledgeRepository.createJob({
        tenantId,
        jobType: "reindex_all",
        createdBy: user.id,
      });
      const kb = await reindexAllKnowledge({ tenantId, apiKey: apiKey!, jobId: job.id });
      const manual = superAdmin ? await runRagReindex(apiKey!) : null;
      await setRagSyncResult(new Date(), null);
      return ok({ success: true, jobId: job.id, knowledge: kb, manual });
    }

    if (action === "reindex_manual" && superAdmin) {
      const manual = await runRagReindex(apiKey!);
      return ok({ success: true, manual });
    }

    return err(`Unknown action: ${action}`, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await setRagSyncResult(new Date(), message);
    return err(message, 500);
  }
}
