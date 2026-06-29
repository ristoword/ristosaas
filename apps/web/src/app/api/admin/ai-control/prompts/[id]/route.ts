import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser, requirePartnerEnterpriseUser } from "@/lib/auth/guards";
import { aiControlAuditRepository, aiPromptRepository } from "@/lib/db/repositories/ai-control.repository";
import { clientIpFromRequest, requireControlMutate } from "@/app/api/admin/ai-control/_helpers";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const guard = await requirePartnerEnterpriseUser(_req);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const template = await aiPromptRepository.getById(id);
  if (!template) return err("Not found", 404);
  return ok({ template });
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const guard = await requireApiUser(req, ["super_admin"]);
  if (guard.error) return guard.error;
  const blocked = requireControlMutate(req, guard.user!);
  if (blocked) return blocked;

  const { id } = await ctx.params;
  const payload = await body<{
    action?: string;
    content?: string;
    systemPrompt?: string;
    changeNote?: string;
    version?: number;
    newKey?: string;
    tenantId?: string | null;
    name?: string;
    active?: boolean;
  }>(req);

  const before = await aiPromptRepository.getById(id);
  if (!before) return err("Not found", 404);

  if (payload?.action === "rollback" && payload.version != null) {
    const template = await aiPromptRepository.rollback(id, payload.version, guard.user!.id);
    await aiControlAuditRepository.record({
      tenantId: before.tenantId,
      actorId: guard.user!.id,
      actorRole: guard.user!.role,
      actorEmail: guard.user!.email,
      operation: "prompt.rollback",
      entityType: "AiPromptTemplate",
      entityId: id,
      oldValue: { version: before.version },
      newValue: { version: template.version },
      ipAddress: clientIpFromRequest(req),
    });
    return ok({ template });
  }

  if (payload?.action === "duplicate" && payload.newKey) {
    const template = await aiPromptRepository.duplicate(id, payload.newKey, payload.tenantId);
    await aiControlAuditRepository.record({
      tenantId: template.tenantId,
      actorId: guard.user!.id,
      actorRole: guard.user!.role,
      actorEmail: guard.user!.email,
      operation: "prompt.duplicate",
      entityType: "AiPromptTemplate",
      entityId: template.id,
      newValue: { from: id },
      ipAddress: clientIpFromRequest(req),
    });
    return ok({ template });
  }

  if (payload?.content == null) return err("content required");

  const template = await aiPromptRepository.updateWithVersion({
    id,
    content: payload.content,
    systemPrompt: payload.systemPrompt ?? before.systemPrompt,
    changeNote: payload.changeNote,
    updatedBy: guard.user!.id,
  });

  if (payload.name != null || payload.active != null) {
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.aiPromptTemplate.update({
      where: { id },
      data: {
        ...(payload.name != null ? { name: payload.name } : {}),
        ...(payload.active != null ? { active: payload.active } : {}),
        updatedBy: guard.user!.id,
      },
    });
  }

  await aiControlAuditRepository.record({
    tenantId: before.tenantId,
    actorId: guard.user!.id,
    actorRole: guard.user!.role,
    actorEmail: guard.user!.email,
    operation: "prompt.update",
    entityType: "AiPromptTemplate",
    entityId: id,
    oldValue: { version: before.version },
    newValue: { version: template.version },
    ipAddress: clientIpFromRequest(req),
  });

  return ok({ template });
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const guard = await requireApiUser(req, ["super_admin"]);
  if (guard.error) return guard.error;
  const blocked = requireControlMutate(req, guard.user!);
  if (blocked) return blocked;

  const { id } = await ctx.params;
  const before = await aiPromptRepository.getById(id);
  if (!before) return err("Not found", 404);

  const { prisma } = await import("@/lib/db/prisma");
  await prisma.aiPromptTemplate.delete({ where: { id } });

  await aiControlAuditRepository.record({
    tenantId: before.tenantId,
    actorId: guard.user!.id,
    actorRole: guard.user!.role,
    actorEmail: guard.user!.email,
    operation: "prompt.delete",
    entityType: "AiPromptTemplate",
    entityId: id,
    oldValue: before,
    ipAddress: clientIpFromRequest(req),
  });

  return ok({ success: true });
}
