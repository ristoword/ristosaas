import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { FolioCharge, GuestFolio } from "@/modules/integration/domain/types";
import type { HousekeepingTask, HotelKeycard, HotelReservation, HotelRoom, HotelStay } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;

const CHECKOUT_REJECT = "CHECKOUT_REJECT:";

function rejectCheckout(message: string): never {
  throw new Error(`${CHECKOUT_REJECT}${message}`);
}

const EPS = 0.005;

function toDateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

function paymentMethodDisplay(
  method?: "cash" | "card" | "room_charge_settlement" | "contanti" | "carta" | "bonifico" | "altro",
): string {
  switch (method) {
    case "cash":
    case "contanti":
      return "contanti";
    case "card":
    case "carta":
      return "carta";
    case "bonifico":
      return "bonifico";
    case "altro":
      return "altro";
    case "room_charge_settlement":
      return "saldo interno";
    default:
      return method ?? "card";
  }
}

function mapReservation(row: {
  id: string;
  customerId: string;
  guestName: string;
  phone: string | null;
  email: string | null;
  roomId: string | null;
  checkInDate: Date;
  checkOutDate: Date;
  guests: number;
  status: HotelReservation["status"];
  roomType: string;
  boardType: HotelReservation["boardType"];
  nights: number;
  rate: { toNumber: () => number };
  documentCode: string | null;
}): HotelReservation {
  return {
    id: row.id,
    customerId: row.customerId,
    guestName: row.guestName,
    phone: row.phone ?? "",
    email: row.email ?? "",
    roomId: row.roomId,
    checkInDate: toDateString(row.checkInDate),
    checkOutDate: toDateString(row.checkOutDate),
    guests: row.guests,
    status: row.status,
    roomType: row.roomType,
    boardType: row.boardType,
    nights: row.nights,
    rate: row.rate.toNumber(),
    documentCode: row.documentCode ?? "",
  };
}

function mapRoom(row: {
  id: string;
  code: string;
  floor: number;
  capacity: number;
  status: HotelRoom["status"];
  roomType: string;
  ratePlanCode: string | null;
  defaultNightlyRate: { toNumber: () => number };
}): HotelRoom {
  return {
    id: row.id,
    code: row.code,
    floor: row.floor,
    capacity: row.capacity,
    status: row.status,
    roomType: row.roomType,
    ratePlanCode: row.ratePlanCode ?? undefined,
    defaultNightlyRate: row.defaultNightlyRate.toNumber(),
  };
}

function mapStay(row: {
  id: string;
  reservationId: string;
  reservation: { roomId: string | null };
  actualCheckInAt: Date | null;
  actualCheckOutAt: Date | null;
}): HotelStay {
  return {
    id: row.id,
    reservationId: row.reservationId,
    roomId: row.reservation.roomId ?? "",
    actualCheckInAt: row.actualCheckInAt ? row.actualCheckInAt.toISOString() : null,
    actualCheckOutAt: row.actualCheckOutAt ? row.actualCheckOutAt.toISOString() : null,
  };
}

function mapTask(row: {
  id: string;
  roomId: string;
  status: string;
  scheduledFor: Date;
}): HousekeepingTask {
  return {
    id: row.id,
    roomId: row.roomId,
    assignedTo: "Housekeeping",
    status: row.status === "in_progress" ? "in_progress" : row.status === "done" ? "done" : "todo",
    scheduledFor: row.scheduledFor.toISOString().slice(0, 10),
    inspected: false,
  };
}

function mapFolio(row: {
  id: string;
  tenantId: string;
  customerId: string;
  stayId: string | null;
  currency: string;
  balance: Prisma.Decimal;
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

function mapCard(row: {
  id: string;
  roomId: string;
  reservationId: string;
  validFrom: Date;
  validUntil: Date;
  status: HotelKeycard["status"];
  issuedBy: string;
}): HotelKeycard {
  return {
    id: row.id,
    roomId: row.roomId,
    reservationId: row.reservationId,
    validFrom: row.validFrom.toISOString(),
    validUntil: row.validUntil.toISOString(),
    status: row.status,
    issuedBy: row.issuedBy,
  };
}

async function sumChargesForFolio(tx: Prisma.TransactionClient, folioId: string) {
  const rows = await tx.folioCharge.findMany({ where: { folioId } });
  return rows.reduce((s, c) => s + c.amount.toNumber(), 0);
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const {
    reservationId,
    cityTaxAmount = 0,
    paymentMethod = "card",
    allowResidual = false,
    implicitFullPayment = true,
  } = await body<{
    reservationId: string;
    cityTaxAmount?: number;
    paymentMethod?:
      | "cash"
      | "card"
      | "room_charge_settlement"
      | "contanti"
      | "carta"
      | "bonifico"
      | "altro";
    allowResidual?: boolean;
    /** Se true (default), salda automaticamente il saldo residuo in un’unica riga di pagamento (compatibilità col flusso precedente). Se false, il saldo deve essere già coperto da pagamenti registrati o da `allowResidual`. */
    implicitFullPayment?: boolean;
  }>(req);

  if (!reservationId) return err("reservationId required");
  const tenantId = getTenantId();
  const now = new Date();
  const tax = typeof cityTaxAmount === "number" && !Number.isNaN(cityTaxAmount) ? Math.max(0, cityTaxAmount) : 0;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.hotelReservation.findFirst({
        where: { id: reservationId, tenantId, status: "in_casa" },
      });
      if (!reservation || reservation.roomId === null) {
        rejectCheckout("La prenotazione non è in casa, è già in check-out o non ha una camera assegnata.");
      }
      const roomId = reservation.roomId;

      const stay = await tx.stay.upsert({
        where: { reservationId: reservation.id },
        update: { actualCheckOutAt: now },
        create: {
          tenantId,
          reservationId: reservation.id,
          actualCheckOutAt: now,
        },
        select: {
          id: true,
          reservationId: true,
          reservation: { select: { roomId: true } },
          actualCheckInAt: true,
          actualCheckOutAt: true,
        },
      });

      let folio = await tx.guestFolio.findFirst({
        where: {
          tenantId,
          OR: [{ stayId: stay.id }, { customerId: reservation.customerId, status: "open" }],
        },
        orderBy: { id: "asc" },
      });

      if (!folio) {
        folio = await tx.guestFolio.create({
          data: {
            tenantId,
            customerId: reservation.customerId,
            stayId: stay.id,
            currency: "EUR",
            balance: 0,
            status: "open",
          },
        });
      }

      if (tax > EPS) {
        await tx.folioCharge.create({
          data: {
            folioId: folio.id,
            source: "city_tax",
            sourceId: reservation.id,
            description: "Tassa di soggiorno",
            amount: tax,
            postedAt: now,
          },
        });
      }

      let balanceSum = await sumChargesForFolio(tx, folio.id);

      if (implicitFullPayment && !allowResidual && balanceSum > EPS) {
        await tx.folioCharge.create({
          data: {
            folioId: folio.id,
            source: "payment",
            sourceId: reservation.id,
            description: `Saldo finale soggiorno (${paymentMethodDisplay(paymentMethod)})`,
            amount: -balanceSum,
            postedAt: now,
          },
        });
        balanceSum = await sumChargesForFolio(tx, folio.id);
      }

      if (balanceSum > EPS && !allowResidual) {
        rejectCheckout(
          `Saldo aperto di €${balanceSum.toFixed(2)}. Registra un pagamento dalla sezione checkout oppure abilita il checkout con residuo autorizzato.`,
        );
      }

      const updatedReservation = await tx.hotelReservation.update({
        where: { id: reservation.id },
        data: { status: "check_out" },
      });

      const updatedRoom = await tx.hotelRoom.update({
        where: { id: roomId },
        data: { status: "da_pulire" },
      });

      const task = await tx.housekeepingTask.create({
        data: {
          tenantId,
          roomId,
          status: "todo",
          scheduledFor: now,
        },
        select: {
          id: true,
          roomId: true,
          status: true,
          scheduledFor: true,
        },
      });

      await tx.hotelKeycard.updateMany({
        where: {
          tenantId,
          reservationId: reservation.id,
          status: "attiva",
        },
        data: {
          status: "annullata",
        },
      });

      let closedFolio;
      if (balanceSum > EPS && allowResidual) {
        closedFolio = await tx.guestFolio.update({
          where: { id: folio.id },
          data: {
            balance: balanceSum,
            status: "open",
          },
        });
      } else {
        closedFolio = await tx.guestFolio.update({
          where: { id: folio.id },
          data: {
            balance: 0,
            status: "closed",
          },
        });
      }

      const keycards = await tx.hotelKeycard.findMany({
        where: {
          tenantId,
          reservationId: reservation.id,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          roomId: true,
          reservationId: true,
          validFrom: true,
          validUntil: true,
          status: true,
          issuedBy: true,
        },
      });

      const charges = await tx.folioCharge.findMany({
        where: { folioId: folio.id },
        orderBy: { postedAt: "desc" },
      });

      const lastPayment = charges.find((c) => c.source === "payment");

      return {
        reservation: mapReservation(updatedReservation),
        room: mapRoom(updatedRoom),
        stay: mapStay(stay),
        housekeepingTask: mapTask(task),
        keycards: keycards.map(mapCard),
        folio: {
          folio: mapFolio(closedFolio),
          charges: charges.map((c) => mapCharge(c)),
          settlement: lastPayment ? mapCharge(lastPayment) : null,
        },
      };
    });

    return ok(result);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith(CHECKOUT_REJECT)) {
      return err(e.message.slice(CHECKOUT_REJECT.length), 400);
    }
    throw e;
  }
}
