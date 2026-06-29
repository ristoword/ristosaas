import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { canReadKnowledge, canWriteKnowledge, isKnowledgeSuperAdmin } from "@/lib/ai/knowledge/access";
import { detectMimeType, extractTextFromDocument } from "@/lib/ai/rag/text-extract";
import { indexKnowledgeDocument } from "@/lib/ai/rag/indexing-service";
import { knowledgeRepository } from "@/lib/db/repositories/knowledge.repository";
import { clientIpFromRequest } from "@/lib/security/rate-limit";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const user = guard.user!;
  if (!canReadKnowledge(user)) return err("Forbidden", 403);

  const { id } = await ctx.params;
  const doc = await knowledgeRepository.getDocument(id, user.tenantId, isKnowledgeSuperAdmin(user));
  if (!doc) return err("Not found", 404);
  return ok({ document: doc });
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const user = guard.user!;
  if (!canWriteKnowledge(user)) return err("Forbidden", 403);

  const { id } = await ctx.params;
  const superAdmin = isKnowledgeSuperAdmin(user);
  const existing = await knowledgeRepository.getDocument(id, user.tenantId, superAdmin);
  if (!existing) return err("Not found", 404);

  const payload = await body<{
    title?: string;
    module?: string;
    category?: string;
    language?: string;
    contentText?: string;
    contentBase64?: string;
    fileName?: string;
    mimeType?: string;
  }>(req);

  let contentHash = existing.contentHash;
  let contentText = existing.contentText;
  if (payload.contentText || payload.contentBase64) {
    const extracted = await extractTextFromDocument({
      mimeType: payload.mimeType || existing.mimeType,
      contentText: payload.contentText,
      contentBase64: payload.contentBase64,
      fileName: payload.fileName || existing.fileName,
    });
    contentHash = extracted.contentHash;
    contentText = extracted.text;
  }

  const updated = await knowledgeRepository.updateDocument(
    id,
    {
      title: payload.title?.trim() || undefined,
      module: payload.module?.trim() || undefined,
      category: payload.category?.trim() || undefined,
      language: payload.language || undefined,
      contentText,
      contentHash,
      status: contentHash !== existing.contentHash ? "pending" : undefined,
      version: contentHash !== existing.contentHash ? { increment: 1 } : undefined,
    },
    user.tenantId,
    superAdmin,
  );

  void knowledgeRepository.recordAudit({
    tenantId: existing.tenantId,
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: "knowledge.update",
    documentId: id,
    ipAddress: clientIpFromRequest(req),
  });

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey && contentHash !== existing.contentHash) {
    void indexKnowledgeDocument({ documentId: id, apiKey }).catch(() => undefined);
  }

  return ok({ document: updated });
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const user = guard.user!;
  if (!canWriteKnowledge(user)) return err("Forbidden", 403);

  const { id } = await ctx.params;
  const superAdmin = isKnowledgeSuperAdmin(user);
  const existing = await knowledgeRepository.getDocument(id, user.tenantId, superAdmin);
  if (!existing) return err("Not found", 404);

  await knowledgeRepository.softDeleteDocument(id, user.tenantId, superAdmin);

  void knowledgeRepository.recordAudit({
    tenantId: existing.tenantId,
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: "knowledge.delete",
    documentId: id,
    ipAddress: clientIpFromRequest(req),
  });

  return ok({ success: true });
}
