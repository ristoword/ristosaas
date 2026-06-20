import { prisma } from "@/lib/db/prisma";

export type WineColor = "rosso" | "bianco" | "rosé" | "bollicine" | "passito" | "orange";
export type WineBody = "leggero" | "medio" | "corposo" | "forte" | "dolce" | "secco";

export type WineCellarItem = {
  id: string;
  tenantId: string;
  name: string;
  producer: string;
  country: string;
  region: string;
  color: string;
  body: string;
  grapeVariety: string;
  alcoholPct: number;
  vintageYear: number | null;
  bottlingYear: number | null;
  pairings: string;
  purchasePrice: number;
  sellingPrice: number;
  showPurchasePrice: boolean;
  stock: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type DecimalLike = { toNumber: () => number };

function mapItem(row: {
  id: string;
  tenantId: string;
  name: string;
  producer: string;
  country: string;
  region: string;
  color: string;
  body: string;
  grapeVariety: string;
  alcoholPct: DecimalLike;
  vintageYear: number | null;
  bottlingYear: number | null;
  pairings: string;
  purchasePrice: DecimalLike;
  sellingPrice: DecimalLike;
  showPurchasePrice: boolean;
  stock: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}): WineCellarItem {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    producer: row.producer,
    country: row.country,
    region: row.region,
    color: row.color,
    body: row.body,
    grapeVariety: row.grapeVariety,
    alcoholPct: row.alcoholPct.toNumber(),
    vintageYear: row.vintageYear,
    bottlingYear: row.bottlingYear,
    pairings: row.pairings,
    purchasePrice: row.purchasePrice.toNumber(),
    sellingPrice: row.sellingPrice.toNumber(),
    showPurchasePrice: row.showPurchasePrice,
    stock: row.stock,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type WineCellarCreatePayload = {
  name: string;
  producer?: string;
  country?: string;
  region?: string;
  color?: string;
  body?: string;
  grapeVariety?: string;
  alcoholPct?: number;
  vintageYear?: number | null;
  bottlingYear?: number | null;
  pairings?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  showPurchasePrice?: boolean;
  stock?: number;
  notes?: string;
};

export type WineCellarUpdatePayload = Partial<WineCellarCreatePayload>;

export const wineCellarRepository = {
  async list(
    tenantId: string,
    params?: { color?: string; country?: string; search?: string },
  ): Promise<WineCellarItem[]> {
    const where: Record<string, unknown> = { tenantId };
    if (params?.color) where.color = params.color;
    if (params?.country) where.country = params.country;
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { producer: { contains: params.search, mode: "insensitive" } },
        { region: { contains: params.search, mode: "insensitive" } },
        { grapeVariety: { contains: params.search, mode: "insensitive" } },
      ];
    }
    const rows = await prisma.wineCellarItem.findMany({
      where,
      orderBy: [{ name: "asc" }],
    });
    return rows.map(mapItem);
  },

  async create(tenantId: string, payload: WineCellarCreatePayload): Promise<WineCellarItem> {
    const row = await prisma.wineCellarItem.create({
      data: {
        tenantId,
        name: payload.name,
        producer: payload.producer ?? "",
        country: payload.country ?? "",
        region: payload.region ?? "",
        color: payload.color ?? "rosso",
        body: payload.body ?? "",
        grapeVariety: payload.grapeVariety ?? "",
        alcoholPct: payload.alcoholPct ?? 0,
        vintageYear: payload.vintageYear ?? null,
        bottlingYear: payload.bottlingYear ?? null,
        pairings: payload.pairings ?? "",
        purchasePrice: payload.purchasePrice ?? 0,
        sellingPrice: payload.sellingPrice ?? 0,
        showPurchasePrice: payload.showPurchasePrice ?? false,
        stock: payload.stock ?? 0,
        notes: payload.notes ?? "",
      },
    });
    return mapItem(row);
  },

  async update(tenantId: string, id: string, payload: WineCellarUpdatePayload): Promise<WineCellarItem | null> {
    const existing = await prisma.wineCellarItem.findFirst({ where: { id, tenantId } });
    if (!existing) return null;
    const row = await prisma.wineCellarItem.update({
      where: { id },
      data: {
        name: payload.name,
        producer: payload.producer,
        country: payload.country,
        region: payload.region,
        color: payload.color,
        body: payload.body,
        grapeVariety: payload.grapeVariety,
        alcoholPct: payload.alcoholPct,
        vintageYear: payload.vintageYear,
        bottlingYear: payload.bottlingYear,
        pairings: payload.pairings,
        purchasePrice: payload.purchasePrice,
        sellingPrice: payload.sellingPrice,
        showPurchasePrice: payload.showPurchasePrice,
        stock: payload.stock,
        notes: payload.notes,
      },
    });
    return mapItem(row);
  },

  async delete(tenantId: string, id: string): Promise<boolean> {
    const existing = await prisma.wineCellarItem.findFirst({ where: { id, tenantId } });
    if (!existing) return false;
    await prisma.wineCellarItem.delete({ where: { id } });
    return true;
  },
};
