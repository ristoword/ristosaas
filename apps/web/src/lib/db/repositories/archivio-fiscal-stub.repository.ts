import { prisma } from "@/lib/db/prisma";

export type ArchivioFiscalStubKind = "entrata" | "cassa";

export type ArchivioFiscalStubRow = {
  id: string;
  tenantId: string;
  kind: ArchivioFiscalStubKind;
  reference: string;
  counterparty: string;
  issueDate: string;
  amount: number;
  vatRateNote: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

function map(row: {
  id: string;
  tenantId: string;
  kind: string;
  reference: string;
  counterparty: string;
  issueDate: Date;
  amount: { toNumber: () => number };
  vatRateNote: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}): ArchivioFiscalStubRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    kind: row.kind as ArchivioFiscalStubKind,
    reference: row.reference,
    counterparty: row.counterparty,
    issueDate: row.issueDate.toISOString().slice(0, 10),
    amount: row.amount.toNumber(),
    vatRateNote: row.vatRateNote,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const archivioFiscalStubRepository = {
  async list(tenantId: string, kind: ArchivioFiscalStubKind): Promise<ArchivioFiscalStubRow[]> {
    const rows = await prisma.archivioFiscalStub.findMany({
      where: { tenantId, kind },
      orderBy: { issueDate: "desc" },
    });
    return rows.map(map);
  },

  async create(
    tenantId: string,
    kind: ArchivioFiscalStubKind,
    input: {
      reference?: string;
      counterparty?: string;
      issueDate?: string;
      amount?: number;
      vatRateNote?: string;
      notes?: string;
    },
  ): Promise<ArchivioFiscalStubRow> {
    const issueDate = input.issueDate ? new Date(`${input.issueDate}T12:00:00Z`) : new Date();
    const row = await prisma.archivioFiscalStub.create({
      data: {
        tenantId,
        kind,
        reference: input.reference ?? "",
        counterparty: input.counterparty ?? "",
        issueDate,
        amount: input.amount ?? 0,
        vatRateNote: input.vatRateNote ?? "",
        notes: input.notes ?? "",
      },
    });
    return map(row);
  },
};
