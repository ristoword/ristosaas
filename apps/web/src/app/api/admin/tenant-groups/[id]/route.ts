import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const ROLES = ["super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/tenant-groups/:id
 * Update group name or add/remove tenant members.
 * Body: { name?: string, addTenantIds?: string[], removeTenantIds?: string[] }
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;

  const group = await prisma.tenantGroup.findUnique({ where: { id } });
  if (!group) return err("Gruppo non trovato.", 404);

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  const body = parsed as {
    name?: string;
    addTenantIds?: string[];
    removeTenantIds?: string[];
  };

  if (body.name?.trim()) {
    await prisma.tenantGroup.update({
      where: { id },
      data: { name: body.name.trim() },
    });
  }

  if (body.addTenantIds?.length) {
    const validIds = body.addTenantIds.filter((tid) => typeof tid === "string" && tid.trim());
    const existing = await prisma.tenant.findMany({
      where: { id: { in: validIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((t) => t.id));

    const alreadyMembers = await prisma.tenantGroupMember.findMany({
      where: { groupId: id, tenantId: { in: validIds } },
      select: { tenantId: true },
    });
    const alreadySet = new Set(alreadyMembers.map((m) => m.tenantId));

    const toAdd = validIds.filter((tid) => existingIds.has(tid) && !alreadySet.has(tid));
    if (toAdd.length > 0) {
      await prisma.tenantGroupMember.createMany({
        data: toAdd.map((tenantId) => ({ groupId: id, tenantId })),
      });
    }
  }

  if (body.removeTenantIds?.length) {
    await prisma.tenantGroupMember.deleteMany({
      where: { groupId: id, tenantId: { in: body.removeTenantIds } },
    });
  }

  const updated = await prisma.tenantGroup.findUnique({
    where: { id },
    include: {
      members: { select: { id: true, tenantId: true, label: true, addedAt: true } },
    },
  });

  return ok(updated);
}

/**
 * DELETE /api/admin/tenant-groups/:id
 * Deletes a tenant group (members are cascade-deleted).
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;

  const group = await prisma.tenantGroup.findUnique({ where: { id } });
  if (!group) return err("Gruppo non trovato.", 404);

  await prisma.tenantGroup.delete({ where: { id } });
  return ok({ deleted: true });
}
