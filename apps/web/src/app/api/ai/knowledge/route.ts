import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { canReadKnowledge, canWriteKnowledge, isKnowledgeSuperAdmin } from "@/lib/ai/knowledge/access";
import { detectMimeType, extractTextFromDocument } from "@/lib/ai/rag/text-extract";
import { indexKnowledgeDocument, syncTenantEntities } from "@/lib/ai/rag/indexing-service";
import { getKnowledgeStats } from "@/lib/ai/rag/retrieval";
import { knowledgeRepository } from "@/lib/db/repositories/knowledge.repository";
import { clientIpFromRequest } from "@/lib/security/rate-limit";

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const user = guard.user!;
  if (!canReadKnowledge(user)) return err("Forbidden", 403);

  const superAdmin = isKnowledgeSuperAdmin(user);
  const url = new URL(req.url);
  const docModule = url.searchParams.get("module") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const search = url.searchParams.get("q") ?? undefined;
  const tenantFilter = superAdmin ? url.searchParams.get("tenantId") ?? undefined : user.tenantId;

  const { items, total } = await knowledgeRepository.listDocuments({
    tenantId: tenantFilter,
    module: docModule,
    category,
    status,
    search,
    superAdmin,
    limit: Number(url.searchParams.get("limit") || 50),
    offset: Number(url.searchParams.get("offset") || 0),
  });

  return ok({ items, total });
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const user = guard.user!;
  if (!canWriteKnowledge(user)) return err("Forbidden", 403);

  const payload = await body<{
    title?: string;
    module?: string;
    category?: string;
    language?: string;
    mimeType?: string;
    fileName?: string;
    contentText?: string;
    contentBase64?: string;
    tenantId?: string;
  }>(req);

  if (!payload?.title?.trim()) return err("title required", 400);
  if (!payload.module?.trim()) return err("module required", 400);

  const superAdmin = isKnowledgeSuperAdmin(user);
  const tenantId = superAdmin ? payload.tenantId ?? user.tenantId ?? null : user.tenantId ?? null;
  if (!tenantId && !superAdmin) return err("tenantId required", 400);

  const mimeType = payload.mimeType || detectMimeType(payload.fileName || payload.title);
  const extracted = await extractTextFromDocument({
    mimeType,
    contentText: payload.contentText,
    contentBase64: payload.contentBase64,
    fileName: payload.fileName,
  });

  const doc = await knowledgeRepository.createUploadDocument({
    tenantId,
    title: payload.title.trim(),
    module: payload.module.trim(),
    category: payload.category?.trim() || "general",
    mimeType,
    language: payload.language || "it",
    contentText: extracted.text,
    contentBase64: payload.contentBase64,
    contentHash: extracted.contentHash,
    fileName: payload.fileName,
    fileSizeBytes: payload.contentBase64 ? Buffer.byteLength(payload.contentBase64, "base64") : extracted.charCount,
    authorId: user.id,
    authorName: user.name,
  });

  void knowledgeRepository.recordAudit({
    tenantId,
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: "knowledge.upload",
    documentId: doc.id,
    ipAddress: clientIpFromRequest(req),
  });

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey) {
    void indexKnowledgeDocument({ documentId: doc.id, apiKey }).catch(() => undefined);
  }

  return ok({ document: doc }, 201);
}
