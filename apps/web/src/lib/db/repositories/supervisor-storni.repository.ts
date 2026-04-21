import { prisma } from "@/lib/db/prisma";

export type SupervisorStornoRow = {
  id: string;
  tenantId: string;
  amount: number;
  motivo: string;
  tavolo: string;
  ordineId: string;
  note: string;
  createdAt: string;
};

function map(row: {
  id: string;
  tenantId: string;
  amount: { toNumber: () => number };
  motivo: string;
  tavolo: string;
  ordineId: string;
  note: string;
  createdAt: Date;
}): SupervisorStornoRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    amount: row.amount.toNumber(),
    motivo: row.motivo,
    tavolo: row.tavolo,
    ordineId: row.ordineId,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

export const supervisorStorniRepository = {
  async list(tenantId: string): Promise<SupervisorStornoRow[]> {
    const rows = await prisma.supervisorStorno.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(map);
  },

  async create(
    tenantId: string,
    input: { amount: number; motivo: string; tavolo?: string; ordineId?: string; note?: string },
  ): Promise<SupervisorStornoRow> {
    const row = await prisma.supervisorStorno.create({
      data: {
        tenantId,
        amount: input.amount,
        motivo: input.motivo,
        tavolo: input.tavolo ?? "",
        ordineId: input.ordineId ?? "",
        note: input.note ?? "",
      },
    });
    return map(row);
  },
};
