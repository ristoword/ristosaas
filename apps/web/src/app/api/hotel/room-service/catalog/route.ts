import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import type { RoomServiceCategory } from "@prisma/client";

const CATALOG_ROLES = ["hotel_manager", "supervisor", "owner", "super_admin"] as const;
const READ_ROLES = ["staff", "reception", "housekeeping", "hotel_manager", "supervisor", "owner", "super_admin"] as const;

const SELECT = {
  id: true, name: true, category: true, unitPrice: true, unit: true,
  active: true, sortOrder: true, createdAt: true, updatedAt: true,
} as const;

function serialize(r: { unitPrice: unknown; createdAt: Date; updatedAt: Date; [k: string]: unknown }) {
  return { ...r, unitPrice: Number(r.unitPrice), createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
}

/** GET /api/hotel/room-service/catalog?category=food&active=1 */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...READ_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const p = req.nextUrl.searchParams;
  const category = p.get("category") as RoomServiceCategory | null;
  const activeOnly = p.get("active") !== "0";

  const rows = await prisma.roomServiceCatalogItem.findMany({
    where: {
      tenantId,
      ...(category ? { category } : {}),
      ...(activeOnly ? { active: true } : {}),
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: SELECT,
  });

  return ok(rows.map(serialize));
}

/** POST /api/hotel/room-service/catalog */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...CATALOG_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const data = await body<{
    name: string;
    category: RoomServiceCategory;
    unitPrice: number;
    unit?: string;
    sortOrder?: number;
  }>(req);

  if (!data.name?.trim()) return err("name è obbligatorio", 400);
  if (data.unitPrice == null || data.unitPrice < 0) return err("unitPrice non valido", 400);

  const row = await prisma.roomServiceCatalogItem.create({
    data: {
      tenantId,
      name: data.name.trim(),
      category: data.category,
      unitPrice: data.unitPrice,
      unit: data.unit?.trim() || "pz",
      sortOrder: data.sortOrder ?? 0,
    },
    select: SELECT,
  });

  return ok(serialize(row), 201);
}
