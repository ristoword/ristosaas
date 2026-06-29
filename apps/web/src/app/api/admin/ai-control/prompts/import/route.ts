import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { aiControlAuditRepository, aiPromptRepository } from "@/lib/db/repositories/ai-control.repository";
import { clientIpFromRequest, requireControlMutate } from "@/app/api/admin/ai-control/_helpers";

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ["super_admin"]);
  if (guard.error) return guard.error;
  const blocked = requireControlMutate(req, guard.user!);
  if (blocked) return blocked;

  const payload = await body<{ templates?: Array<{ key: string; name: string; module: string; content: string; systemPrompt?: string; tags?: string[] }> }>(req);
  if (!payload?.templates?.length) return err("templates array required");

  const created = [];
  for (const t of payload.templates) {
    const template = await aiPromptRepository.create({
      key: t.key,
      name: t.name,
      module: t.module,
      content: t.content,
      systemPrompt: t.systemPrompt ?? "",
      tags: t.tags ?? [],
      createdBy: guard.user!.id,
      updatedBy: guard.user!.id,
    });
    created.push(template);
  }

  await aiControlAuditRepository.record({
    actorId: guard.user!.id,
    actorRole: guard.user!.role,
    actorEmail: guard.user!.email,
    operation: "prompt.import",
    entityType: "AiPromptTemplate",
    newValue: { count: created.length },
    ipAddress: clientIpFromRequest(req),
  });

  return ok({ imported: created.length, templates: created });
}

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ["super_admin", "partner"]);
  if (guard.error) return guard.error;

  const url = new URL(req.url);
  const tenantId = guard.user!.role === "super_admin" ? url.searchParams.get("tenantId") ?? undefined : guard.user!.tenantId;
  const rows = await aiPromptRepository.list(tenantId);
  const json = aiPromptRepository.exportJson(
    rows.map((r) => ({
      key: r.key,
      name: r.name,
      module: r.module,
      content: r.content,
      systemPrompt: r.systemPrompt,
      tags: r.tags,
    })),
  );

  return new Response(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="ai-prompts-${Date.now()}.json"`,
    },
  });
}
