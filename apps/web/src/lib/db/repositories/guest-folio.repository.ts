import { prisma } from "@/lib/db/prisma";
import type { FolioCharge, GuestFolio } from "@/modules/integration/domain/types";

function mapFolio(row: {
  id: string;
  tenantId: string;
  customerId: string;
  stayId: string | null;
  currency: string;
  balance: { toNumber: () => number };
  status: GuestFolio["status"];
}): GuestFolio {
  return {
    id: row.id,
    tenantId: row.tenantId,
    customerId: row.customerId,
    stayId: row.stayId,
    currency: row.currency,
    balance: row.balance.toNumber(),
    status: row.status,
  };
}

function mapCharge(row: {
  id: string;
  folioId: string;
  source: FolioCharge["source"];
  sourceId: string | null;
  description: string;
  amount: { toNumber: () => number };
  postedAt: Date;
}): FolioCharge {
  return {
    id: row.id,
    folioId: row.folioId,
    source: row.source,
    sourceId: row.sourceId,
    description: row.description,
    amount: row.amount.toNumber(),
    postedAt: row.postedAt.toISOString(),
  };
}

export const guestFolioRepository = {
  async allFolios(tenantId: string) {
    const rows = await prisma.guestFolio.findMany({
      where: { tenantId },
      orderBy: { id: "asc" },
    });
    return rows.map(mapFolio);
  },
  async allCharges(tenantId: string) {
    const rows = await prisma.folioCharge.findMany({
      where: {
        folio: {
          tenantId,
        },
      },
      orderBy: { postedAt: "desc" },
    });
    return rows.map(mapCharge);
  },
};
