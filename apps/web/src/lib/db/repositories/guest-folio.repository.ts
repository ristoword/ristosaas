import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { FolioCharge, GuestFolio } from "@/modules/integration/domain/types";

type FolioRow = {
  id: string;
  tenantId: string;
  customerId: string;
  stayId: string | null;
  currency: string;
  balance: Prisma.Decimal;
  status: GuestFolio["status"];
  customer?: { name: string | null } | null;
  stay?: {
    reservationId: string;
    reservation: {
      guestName: string | null;
      roomId: string | null;
      room: { code: string } | null;
    } | null;
  } | null;
};

function mapFolio(row: FolioRow): GuestFolio {
  const stayReservation = row.stay?.reservation ?? null;
  return {
    id: row.id,
    tenantId: row.tenantId,
    customerId: row.customerId,
    stayId: row.stayId,
    currency: row.currency,
    balance: row.balance.toNumber(),
    status: row.status,
    guestName: stayReservation?.guestName ?? row.customer?.name ?? null,
    roomCode: stayReservation?.room?.code ?? null,
    reservationId: row.stay?.reservationId ?? null,
  };
}

function mapCharge(row: {
  id: string;
  folioId: string;
  source: FolioCharge["source"];
  sourceId: string | null;
  description: string;
  amount: Prisma.Decimal;
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
      include: {
        customer: { select: { name: true } },
        stay: {
          select: {
            reservationId: true,
            reservation: {
              select: {
                guestName: true,
                roomId: true,
                room: { select: { code: true } },
              },
            },
          },
        },
      },
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
