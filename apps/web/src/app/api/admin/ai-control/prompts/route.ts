import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser, requirePartnerEnterpriseUser } from "@/lib/auth/guards";
import { aiControlAuditRepository, aiPromptRepository } from "@/lib/db/repositories/ai-control.repository";
import { clientIpFromRequest, requireControlMutate } from "@/app/api/admin/ai-control/_helpers";

export async function GET(req: NextRequest) {
  const guard = await requirePartnerEnterpriseUser(req);
  if (guard.error) return guard.error;
  const url = new URL(req.url);
  const tenantId = guard.user!.role === "super_admin" ? url.searchParams.get("tenantId") ?? undefined : guard.user!.tenantId;
  const rows = await aiPromptRepository.list(tenantId);
  return ok({ items: rows });
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ["super_admin"]);
  if (guard.error) return guard.error;
  const blocked = requireControlMutate(req, guard.user!);
  if (blocked) return blocked;

  const payload = await body<{
    tenantId?: string | null;
    key?: string;
    name?: string;
    module?: string;
    description?: string;
    content?: string;
    systemPrompt?: string;
    tags?: string[];
  }>(req);

  if (!payload?.key || !payload.name || !payload.content) return err("key, name, content required");

  const template = await aiPromptRepository.create({
    ...(payload.tenantId ? { tenant: { connect: { id: payload.tenantId } } } : {}),
    key: payload.key,
    name: payload.name,
    module: payload.module ?? "general",
    description: payload.description ?? "",
    content: payload.content,
    systemPrompt: payload.systemPrompt ?? "",
    tags: payload.tags ?? [],
    createdBy: guard.user!.id,
    updatedBy: guard.user!.id,
  });

  await aiControlAuditRepository.record({
    tenantId: payload.tenantId ?? null,
    actorId: guard.user!.id,
    actorRole: guard.user!.role,
    actorEmail: guard.user!.email,
    operation: "prompt.create",
    entityType: "AiPromptTemplate",
    entityId: template.id,
    newValue: template,
    ipAddress: clientIpFromRequest(req),
  });

  return ok({ template });
}
