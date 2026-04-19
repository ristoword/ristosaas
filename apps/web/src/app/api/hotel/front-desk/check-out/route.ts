import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { FolioCharge, GuestFolio } from "@/modules/integration/domain/types";
import type { HousekeepingTask, HotelKeycard, HotelReservation, HotelRoom, HotelStay } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "super_admin"] as const;

function toDateString(value: Date) {
  return value.toISOString().slice(0, 10);
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
}): HotelRoom {
  return {
    id: row.id,
    code: row.code,
    floor: row.floor,
    capacity: row.capacity,
    status: row.status,
    roomType: row.roomType,
    ratePlanCode: row.ratePlanCode ?? undefined,
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

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const { reservationId, cityTaxAmount = 0, paymentMethod = "card" } = await body<{
    reservationId: string;
    cityTaxAmount?: number;
    paymentMethod?: "cash" | "card" | "room_charge_settlement";
  }>(req);
  if (!reservationId) return err("reservationId required");
  const tenantId = getTenantId();
  const now = new Date();

  const reservation = await prisma.hotelReservation.findFirst({
    where: { id: reservationId, tenantId },
  });
  if (!reservation || !reservation.roomId) return err("Reservation not found", 404);

  const updatedReservation = await prisma.hotelReservation.update({
    where: { id: reservation.id },
    data: { status: "check_out" },
  });

  const updatedRoom = await prisma.hotelRoom.update({
    where: { id: reservation.roomId },
    data: { status: "da_pulire" },
  });

  const stay = await prisma.stay.upsert({
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

  const task = await prisma.housekeepingTask.create({
    data: {
      tenantId,
      roomId: reservation.roomId,
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

  await prisma.hotelKeycard.updateMany({
    where: {
      tenantId,
      reservationId: reservation.id,
      status: "attiva",
    },
    data: {
      status: "annullata",
    },
  });
  const keycards = await prisma.hotelKeycard.findMany({
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

  let folio = await prisma.guestFolio.findFirst({
    where: {
      tenantId,
      OR: [{ stayId: stay.id }, { customerId: reservation.customerId, status: "open" }],
    },
    orderBy: { id: "asc" },
  });

  if (!folio) {
    folio = await prisma.guestFolio.create({
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

  let nextBalance = folio.balance.toNumber();

  if (cityTaxAmount > 0) {
    await prisma.folioCharge.create({
      data: {
        folioId: folio.id,
        source: "city_tax",
        sourceId: reservation.id,
        description: "Tassa di soggiorno",
        amount: cityTaxAmount,
        postedAt: now,
      },
    });
    nextBalance += cityTaxAmount;
  }

  const settlement = await prisma.folioCharge.create({
    data: {
      folioId: folio.id,
      source: "payment",
      sourceId: reservation.id,
      description: `Saldo finale soggiorno (${paymentMethod})`,
      amount: -nextBalance,
      postedAt: now,
    },
  });

  const closedFolio = await prisma.guestFolio.update({
    where: { id: folio.id },
    data: {
      balance: 0,
      status: "closed",
    },
  });

  const charges = await prisma.folioCharge.findMany({
    where: { folioId: folio.id },
    orderBy: { postedAt: "desc" },
  });

  return ok({
    reservation: mapReservation(updatedReservation),
    room: mapRoom(updatedRoom),
    stay: mapStay(stay),
    housekeepingTask: mapTask(task),
    keycards: keycards.map(mapCard),
    folio: {
      folio: mapFolio(closedFolio),
      charges: charges.map(mapCharge),
      settlement: mapCharge(settlement),
    },
  });
}
