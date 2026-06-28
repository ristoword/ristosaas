import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { mapChargeRow } from "@/lib/hotel/folio-service";
import type { FolioAttachmentEntry, FolioAuditLogEntry, FolioCharge, GuestFolio } from "@/modules/integration/domain/types";

type FolioRow = {
  id: string;
  tenantId: string;
  customerId: string;
  stayId: string | null;
  currency: string;
  balance: Prisma.Decimal;
  status: GuestFolio["status"];
  locked: boolean;
  createdAt: Date;
  updatedAt: Date;
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
    locked: row.locked,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    guestName: stayReservation?.guestName ?? row.customer?.name ?? null,
    roomCode: stayReservation?.room?.code ?? null,
    reservationId: row.stay?.reservationId ?? null,
  };
}

export const guestFolioRepository = {
  async allFolios(tenantId: string) {
    const rows = await prisma.guestFolio.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
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
    return rows.map((r) => mapFolio(r as FolioRow));
  },

  async getFolio(tenantId: string, folioId: string) {
    const row = await prisma.guestFolio.findFirst({
      where: { id: folioId, tenantId },
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
    return row ? mapFolio(row as FolioRow) : null;
  },

  async allCharges(tenantId: string) {
    const rows = await prisma.folioCharge.findMany({
      where: { folio: { tenantId }, lineStatus: { not: "void" } },
      orderBy: { postedAt: "desc" },
    });
    return rows.map((r) => mapChargeRow(r));
  },

  async chargesForFolio(tenantId: string, folioId: string): Promise<FolioCharge[]> {
    const rows = await prisma.folioCharge.findMany({
      where: { folioId, folio: { tenantId }, lineStatus: { not: "void" } },
      orderBy: { postedAt: "desc" },
    });
    return rows.map((r) => mapChargeRow(r));
  },

  async getDetail(tenantId: string, folioId: string) {
    const folio = await this.getFolio(tenantId, folioId);
    if (!folio) return null;

    const [charges, auditLogs, attachments] = await Promise.all([
      this.chargesForFolio(tenantId, folioId),
      prisma.folioAuditLog.findMany({
        where: { tenantId, folioId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.folioAttachment.findMany({
        where: { tenantId, folioId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          folioId: true,
          type: true,
          fileName: true,
          mimeType: true,
          fileSize: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      folio,
      charges,
      auditLogs: auditLogs.map(
        (a): FolioAuditLogEntry => ({
          id: a.id,
          folioId: a.folioId,
          chargeId: a.chargeId,
          action: a.action,
          field: a.field,
          oldValue: a.oldValue,
          newValue: a.newValue,
          userName: a.userName,
          ip: a.ip,
          createdAt: a.createdAt.toISOString(),
        }),
      ),
      attachments: attachments.map(
        (a): FolioAttachmentEntry => ({
          id: a.id,
          folioId: a.folioId,
          type: a.type,
          fileName: a.fileName,
          mimeType: a.mimeType,
          fileSize: a.fileSize,
          createdAt: a.createdAt.toISOString(),
        }),
      ),
    };
  },
};
