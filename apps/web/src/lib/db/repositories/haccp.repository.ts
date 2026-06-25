import { prisma } from "@/lib/db/prisma";

export type HaccpEntryType =
  | "temp_frigo"
  | "temp_freezer"
  | "temp_cottura"
  | "temp_abbattitore"
  | "sanificazione"
  | "ricezione_merce"
  | "pulizia_manutenzione"
  | "disinfestazione"
  | "non_conformita"
  | "formazione_personale"
  | "olio_frittura"
  | "allergeni"
  | "acqua_potabile"
  | "rifiuti"
  | "altro";

export type HaccpEntry = {
  id: string;
  tenantId: string;
  type: HaccpEntryType;
  recordedAt: string;
  location: string;
  tempC: number | null;
  thresholdMin: number | null;
  thresholdMax: number | null;
  conforme: boolean | null;
  correctiveAction: string;
  operator: string;
  notes: string;
  supplier: string;
  product: string;
  lotNumber: string;
  expiryDate: string | null;
  cleaningProduct: string;
  dilution: string;
  contactTime: string;
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
  thresholdMin: DecimalLike | null;
  thresholdMax: DecimalLike | null;
  conforme: boolean | null;
  correctiveAction: string;
  operator: string;
  notes: string;
  supplier: string;
  product: string;
  lotNumber: string;
  expiryDate: Date | null;
  cleaningProduct: string;
  dilution: string;
  contactTime: string;
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
    thresholdMin: row.thresholdMin ? row.thresholdMin.toNumber() : null,
    thresholdMax: row.thresholdMax ? row.thresholdMax.toNumber() : null,
    conforme: row.conforme,
    correctiveAction: row.correctiveAction,
    operator: row.operator,
    notes: row.notes,
    supplier: row.supplier,
    product: row.product,
    lotNumber: row.lotNumber,
    expiryDate: row.expiryDate ? row.expiryDate.toISOString() : null,
    cleaningProduct: row.cleaningProduct,
    dilution: row.dilution,
    contactTime: row.contactTime,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type HaccpCreatePayload = {
  type?: HaccpEntryType;
  recordedAt?: string;
  location?: string;
  tempC?: number | null;
  thresholdMin?: number | null;
  thresholdMax?: number | null;
  conforme?: boolean | null;
  correctiveAction?: string;
  operator?: string;
  notes?: string;
  supplier?: string;
  product?: string;
  lotNumber?: string;
  expiryDate?: string | null;
  cleaningProduct?: string;
  dilution?: string;
  contactTime?: string;
};

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

  async create(tenantId: string, payload: HaccpCreatePayload): Promise<HaccpEntry> {
    const row = await prisma.haccpEntry.create({
      data: {
        tenantId,
        type: payload.type ?? "temp_frigo",
        recordedAt: payload.recordedAt ? new Date(payload.recordedAt) : new Date(),
        location: payload.location ?? "",
        tempC: payload.tempC == null ? null : payload.tempC,
        thresholdMin: payload.thresholdMin == null ? null : payload.thresholdMin,
        thresholdMax: payload.thresholdMax == null ? null : payload.thresholdMax,
        conforme: payload.conforme ?? null,
        correctiveAction: payload.correctiveAction ?? "",
        operator: payload.operator ?? "",
        notes: payload.notes ?? "",
        supplier: payload.supplier ?? "",
        product: payload.product ?? "",
        lotNumber: payload.lotNumber ?? "",
        expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : null,
        cleaningProduct: payload.cleaningProduct ?? "",
        dilution: payload.dilution ?? "",
        contactTime: payload.contactTime ?? "",
      },
    });
    return mapEntry(row);
  },

  async update(
    tenantId: string,
    id: string,
    payload: Partial<HaccpCreatePayload>,
  ): Promise<HaccpEntry | null> {
    const existing = await prisma.haccpEntry.findFirst({ where: { id, tenantId } });
    if (!existing) return null;
    const data: Record<string, unknown> = {};
    if (payload.type !== undefined) data.type = payload.type;
    if (payload.recordedAt !== undefined) data.recordedAt = new Date(payload.recordedAt);
    if (payload.location !== undefined) data.location = payload.location;
    if (payload.tempC !== undefined) data.tempC = payload.tempC;
    if (payload.thresholdMin !== undefined) data.thresholdMin = payload.thresholdMin;
    if (payload.thresholdMax !== undefined) data.thresholdMax = payload.thresholdMax;
    if (payload.conforme !== undefined) data.conforme = payload.conforme;
    if (payload.correctiveAction !== undefined) data.correctiveAction = payload.correctiveAction;
    if (payload.operator !== undefined) data.operator = payload.operator;
    if (payload.notes !== undefined) data.notes = payload.notes;
    if (payload.supplier !== undefined) data.supplier = payload.supplier;
    if (payload.product !== undefined) data.product = payload.product;
    if (payload.lotNumber !== undefined) data.lotNumber = payload.lotNumber;
    if (payload.expiryDate !== undefined) data.expiryDate = payload.expiryDate ? new Date(payload.expiryDate) : null;
    if (payload.cleaningProduct !== undefined) data.cleaningProduct = payload.cleaningProduct;
    if (payload.dilution !== undefined) data.dilution = payload.dilution;
    if (payload.contactTime !== undefined) data.contactTime = payload.contactTime;

    const row = await prisma.haccpEntry.update({ where: { id }, data });
    return mapEntry(row);
  },

  async delete(tenantId: string, id: string): Promise<boolean> {
    const existing = await prisma.haccpEntry.findFirst({ where: { id, tenantId } });
    if (!existing) return false;
    await prisma.haccpEntry.delete({ where: { id } });
    return true;
  },
};
