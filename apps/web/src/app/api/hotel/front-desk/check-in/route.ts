import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { HotelKeycard, HotelReservation, HotelRoom, HotelStay } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;

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

  const { reservationId, roomId } = await body<{ reservationId: string; roomId: string }>(req);
  if (!reservationId || !roomId) return err("reservationId and roomId required");
  const tenantId = getTenantId();
  const now = new Date();
  const reservation = await prisma.hotelReservation.findFirst({
    where: { id: reservationId, tenantId },
  });
  if (!reservation) return err("Reservation or room not found", 404);

  const room = await prisma.hotelRoom.findFirst({
    where: { id: roomId, tenantId },
  });
  if (!room) return err("Reservation or room not found", 404);

  const updatedReservation = await prisma.hotelReservation.update({
    where: { id: reservation.id },
    data: {
      roomId: room.id,
      status: "in_casa",
    },
  });

  const updatedRoom = await prisma.hotelRoom.update({
    where: { id: room.id },
    data: {
      status: "occupata",
    },
  });

  const stay = await prisma.stay.upsert({
    where: { reservationId: reservation.id },
    update: {
      actualCheckInAt: now,
      actualCheckOutAt: null,
    },
    create: {
      tenantId,
      reservationId: reservation.id,
      actualCheckInAt: now,
    },
    select: {
      id: true,
      reservationId: true,
      reservation: { select: { roomId: true } },
      actualCheckInAt: true,
      actualCheckOutAt: true,
    },
  });

  await prisma.guestFolio.upsert({
    where: { stayId: stay.id },
    update: {},
    create: {
      tenantId,
      customerId: updatedReservation.customerId,
      stayId: stay.id,
      currency: "EUR",
      balance: 0,
      status: "open",
    },
  });

  await prisma.hotelKeycard.updateMany({
    where: {
      tenantId,
      reservationId: reservation.id,
      status: "attiva",
    },
    data: { status: "annullata" },
  });

  const validUntil = new Date(updatedReservation.checkOutDate);
  validUntil.setUTCHours(11, 0, 0, 0);
  const card = await prisma.hotelKeycard.create({
    data: {
      tenantId,
      roomId: room.id,
      reservationId: reservation.id,
      validFrom: now,
      validUntil,
      status: "attiva",
      issuedBy: guard.user?.username || guard.user?.name || "operator",
    },
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

  return ok({
    reservation: mapReservation(updatedReservation),
    room: mapRoom(updatedRoom),
    stay: mapStay(stay),
    card: mapCard(card),
  });
}
