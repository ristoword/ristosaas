import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser, requirePartnerEnterpriseUser } from "@/lib/auth/guards";
import { deleteEmbedding } from "@/lib/ai/control-center/service";
import { clientIpFromRequest, requireControlMutate } from "@/app/api/admin/ai-control/_helpers";

async function listEmbeddings(req: NextRequest) {
  const guard = await requirePartnerEnterpriseUser(req);
  if (guard.error) return guard.error;

  const url = new URL(req.url);
  const tenantId = guard.user!.role === "super_admin" ? url.searchParams.get("tenantId") ?? undefined : guard.user!.tenantId;
  const search = url.searchParams.get("q") ?? undefined;
  const limit = Number(url.searchParams.get("limit") || 100);

  const { buildAiEnterpriseControlCenter } = await import("@/lib/ai/control-center/service");
  const payload = await buildAiEnterpriseControlCenter(guard.user!, { tenantId, embeddingSearch: search });
  return ok({ rows: payload.embeddings.rows.slice(0, limit), total: payload.embeddings.total });
}

export async function GET(req: NextRequest) {
  return listEmbeddings(req);
}

export async function DELETE(req: NextRequest) {
  const guard = await requireApiUser(req, ["super_admin"]);
  if (guard.error) return guard.error;
  const blocked = requireControlMutate(req, guard.user!);
  if (blocked) return blocked;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return err("id required");

  await deleteEmbedding(guard.user!, id, clientIpFromRequest(req));
  return ok({ success: true });
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ["super_admin"]);
  if (guard.error) return guard.error;
  const blocked = requireControlMutate(req, guard.user!);
  if (blocked) return blocked;

  const url = new URL(req.url);
  const documentId = url.searchParams.get("documentId");
  if (!documentId) return err("documentId required");

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return err("OPENAI_API_KEY non configurata", 503);

  const { indexKnowledgeDocument } = await import("@/lib/ai/rag/indexing-service");
  const result = await indexKnowledgeDocument({ documentId, apiKey });
  return ok(result);
}
