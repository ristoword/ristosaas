import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const ROLES = ["super_admin"] as const;

/**
 * GET /api/admin/tenant-groups
 * Lists all tenant groups with their members.
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;

  const groups = await prisma.tenantGroup.findMany({
    include: {
      members: {
        select: {
          id: true,
          tenantId: true,
          label: true,
          addedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const tenantIds = groups.flatMap((g) => g.members.map((m) => m.tenantId));
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true, slug: true, plan: true, accessStatus: true },
  });
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));

  const result = groups.map((g) => ({
    id: g.id,
    name: g.name,
    createdAt: g.createdAt.toISOString(),
    members: g.members.map((m) => ({
      id: m.id,
      tenantId: m.tenantId,
      label: m.label,
      tenantName: tenantMap.get(m.tenantId)?.name ?? "—",
      tenantSlug: tenantMap.get(m.tenantId)?.slug ?? "—",
      tenantPlan: tenantMap.get(m.tenantId)?.plan ?? "—",
      tenantStatus: tenantMap.get(m.tenantId)?.accessStatus ?? "—",
      addedAt: m.addedAt.toISOString(),
    })),
  }));

  return ok(result);
}

/**
 * POST /api/admin/tenant-groups
 * Creates a new tenant group with optional initial members.
 * Body: { name: string, tenantIds?: string[], ownerUserId?: string }
 *
 * ownerUserId: if provided, this user ID will be linked to the group
 * so they can see the multi-locale portfolio in the Owner page.
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  const body = parsed as { name?: string; tenantIds?: string[]; ownerUserId?: string };
  if (!body?.name?.trim()) return err("name è obbligatorio.", 400);

  const tenantIds = (body.tenantIds ?? []).filter((id) => typeof id === "string" && id.trim());

  if (tenantIds.length > 0) {
    const existing = await prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true },
    });
    if (existing.length !== tenantIds.length) {
      return err("Uno o più tenant non trovati.", 400);
    }
  }

  const group = await prisma.tenantGroup.create({
    data: {
      name: body.name.trim(),
      members: tenantIds.length > 0
        ? { create: tenantIds.map((tid) => ({ tenantId: tid })) }
        : undefined,
    },
    include: { members: true },
  });

  return ok(group, 201);
}
