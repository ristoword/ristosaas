import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const CATALOG_ROLES = ["hotel_manager", "supervisor", "owner", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

const SELECT = {
  id: true, name: true, category: true, unitPrice: true, unit: true,
  active: true, sortOrder: true, createdAt: true, updatedAt: true,
} as const;

function serialize(r: { unitPrice: unknown; createdAt: Date; updatedAt: Date; [k: string]: unknown }) {
  return { ...r, unitPrice: Number(r.unitPrice), createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
}

/** PUT /api/hotel/room-service/catalog/:id */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...CATALOG_ROLES]);
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const tenantId = getTenantId();

  const existing = await prisma.roomServiceCatalogItem.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) return err("Voce catalogo non trovata", 404);

  const data = await body<{ name?: string; unitPrice?: number; unit?: string; active?: boolean; sortOrder?: number }>(req);

  const row = await prisma.roomServiceCatalogItem.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.unitPrice !== undefined && { unitPrice: data.unitPrice }),
      ...(data.unit !== undefined && { unit: data.unit.trim() }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
    select: SELECT,
  });

  return ok(serialize(row));
}

/** DELETE /api/hotel/room-service/catalog/:id */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...CATALOG_ROLES]);
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const tenantId = getTenantId();

  const existing = await prisma.roomServiceCatalogItem.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) return err("Voce catalogo non trovata", 404);

  await prisma.roomServiceCatalogItem.delete({ where: { id } });
  return ok({ deleted: true });
}
