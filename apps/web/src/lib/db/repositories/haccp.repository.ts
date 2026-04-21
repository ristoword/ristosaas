import { prisma } from "@/lib/db/prisma";

export type HaccpEntryType =
  | "temp_frigo"
  | "temp_freezer"
  | "temp_cottura"
  | "temp_abbattitore"
  | "sanificazione"
  | "ricezione_merce"
  | "altro";

export type HaccpEntry = {
  id: string;
  tenantId: string;
  type: HaccpEntryType;
  recordedAt: string;
  location: string;
  tempC: number | null;
  operator: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type DecimalLike = { toNumber: () => number };

function mapEntry(row: {
  id: string;
  tenantId: string;
  type: HaccpEntryType;
  recordedAt: Date;
  location: string;
  tempC: DecimalLike | null;
  operator: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}): HaccpEntry {
  return {
    id: row.id,
    tenantId: row.tenantId,
    type: row.type,
    recordedAt: row.recordedAt.toISOString(),
    location: row.location,
    tempC: row.tempC ? row.tempC.toNumber() : null,
    operator: row.operator,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const haccpRepository = {
  async list(
    tenantId: string,
    params?: { type?: HaccpEntryType; from?: string; to?: string; limit?: number },
  ): Promise<HaccpEntry[]> {
    const where: { tenantId: string; type?: HaccpEntryType; recordedAt?: { gte?: Date; lte?: Date } } = { tenantId };
    if (params?.type) where.type = params.type;
    if (params?.from || params?.to) {
      where.recordedAt = {};
      if (params.from) where.recordedAt.gte = new Date(params.from);
      if (params.to) where.recordedAt.lte = new Date(params.to);
    }
    const rows = await prisma.haccpEntry.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      take: params?.limit ?? 200,
    });
    return rows.map(mapEntry);
  },

  async create(
    tenantId: string,
    payload: {
      type?: HaccpEntryType;
      recordedAt?: string;
      location?: string;
      tempC?: number | null;
      operator?: string;
      notes?: string;
    },
  ): Promise<HaccpEntry> {
    const row = await prisma.haccpEntry.create({
      data: {
        tenantId,
        type: payload.type ?? "temp_frigo",
        recordedAt: payload.recordedAt ? new Date(payload.recordedAt) : new Date(),
        location: payload.location ?? "",
        tempC: payload.tempC == null ? null : payload.tempC,
        operator: payload.operator ?? "",
        notes: payload.notes ?? "",
      },
    });
    return mapEntry(row);
  },

  async update(
    tenantId: string,
    id: string,
    payload: Partial<{
      type: HaccpEntryType;
      recordedAt: string;
      location: string;
      tempC: number | null;
      operator: string;
      notes: string;
    }>,
  ): Promise<HaccpEntry | null> {
    const existing = await prisma.haccpEntry.findFirst({ where: { id, tenantId } });
    if (!existing) return null;
    const row = await prisma.haccpEntry.update({
      where: { id },
      data: {
        type: payload.type ?? undefined,
        recordedAt: payload.recordedAt ? new Date(payload.recordedAt) : undefined,
        location: payload.location ?? undefined,
        tempC:
          payload.tempC === undefined ? undefined : payload.tempC === null ? null : payload.tempC,
        operator: payload.operator ?? undefined,
        notes: payload.notes ?? undefined,
      },
    });
    return mapEntry(row);
  },

  async delete(tenantId: string, id: string): Promise<boolean> {
    const existing = await prisma.haccpEntry.findFirst({ where: { id, tenantId } });
    if (!existing) return false;
    await prisma.haccpEntry.delete({ where: { id } });
    return true;
  },
};
