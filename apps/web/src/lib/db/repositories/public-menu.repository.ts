import { prisma } from "@/lib/db/prisma";

export type PublicMenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Categoria come nel gestionale (Primi, Bevande, …). */
  menuCategory: string;
  kind: "food" | "drink";
};

export type PublicMenuPayload = {
  tenantName: string;
  tenantSlug: string;
  items: PublicMenuItem[];
  /** Presente se il menu è aperto da URL con QR tavolo (`/menu/slug/tableId`). */
  table?: { id: string; nome: string };
};

export type PublicMenuLoadOptions = {
  /** Se impostato, il tavolo deve esistere nel tenant attivo o l’intera richiesta fallisce (`null`). */
  tableId?: string;
};

function isDrinkCategory(category: string): boolean {
  const c = category.trim().toLowerCase();
  if (!c) return false;
  return (
    c === "bevande" ||
    c === "drink" ||
    c === "drinks" ||
    c.includes("bevand") ||
    c === "vini" ||
    c === "cocktail" ||
    c === "birre"
  );
}

/**
 * Menu pubblico per slug tenant: solo voci attive, tenant attivo.
 */
/** Tenant attivo per slug (menu pubblico / ordini da link). */
export async function getActivePublicTenantIdBySlug(slug: string): Promise<string | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  const tenant = await prisma.tenant.findFirst({
    where: { slug: trimmed, accessStatus: "active" },
    select: { id: true },
  });
  return tenant?.id ?? null;
}

export async function getPublicMenuByTenantSlug(
  slug: string,
  opts?: PublicMenuLoadOptions,
): Promise<PublicMenuPayload | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const tenant = await prisma.tenant.findFirst({
    where: { slug: trimmed, accessStatus: "active" },
    select: { id: true, name: true, slug: true },
  });
  if (!tenant) return null;

  const wantTableId = opts?.tableId?.trim();
  let table: { id: string; nome: string } | undefined;
  if (wantTableId) {
    const row = await prisma.restaurantTable.findFirst({
      where: { tenantId: tenant.id, id: wantTableId },
      select: { id: true, nome: true },
    });
    if (!row) return null;
    table = { id: row.id, nome: row.nome };
  }

  const rows = await prisma.menuItem.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const items: PublicMenuItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: (row.notes ?? "").trim(),
    price: row.price.toNumber(),
    menuCategory: row.category,
    kind: isDrinkCategory(row.category) ? "drink" : "food",
  }));

  return {
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    items,
    ...(table ? { table } : {}),
  };
}
