import { prisma } from "@/lib/db/prisma";

export type WarehouseVoiceLogRow = {
  id: string;
  tenantId: string;
  transcript: string;
  createdAt: string;
};

function map(row: { id: string; tenantId: string; transcript: string; createdAt: Date }): WarehouseVoiceLogRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    transcript: row.transcript,
    createdAt: row.createdAt.toISOString(),
  };
}

export const warehouseVoiceRepository = {
  async list(tenantId: string, take = 50): Promise<WarehouseVoiceLogRow[]> {
    const rows = await prisma.warehouseVoiceLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take,
    });
    return rows.map(map);
  },

  async append(tenantId: string, transcript: string): Promise<WarehouseVoiceLogRow> {
    const row = await prisma.warehouseVoiceLog.create({
      data: { tenantId, transcript },
    });
    return map(row);
  },
};
