import { NextRequest } from "next/server";
import { body, err, ok, withErrorHandler } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { actorFromRequest, postDepositOnCheckIn, postRoomChargesOnCheckIn } from "@/lib/hotel/folio-service";
import { guestRegisterRepository } from "@/lib/hotel/guest-register-service";
import { complianceRepository } from "@/lib/db/repositories/compliance.repository";
import { encodeLockCredential } from "@/lib/integrations/lock-connector";
import { dispatchPrintJobAsync } from "@/lib/integrations/print-dispatcher";
import { logger } from "@/lib/observability/logger";
import { roomTypesMatch } from "@/modules/hotel/domain/room-type";
import type { HotelKeycard, HotelReservation, HotelRoom, HotelStay } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;
const CHECKIN_ROOM_STATUSES = new Set(["libera", "pulita"]);

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

export const POST = withErrorHandler(async (req: NextRequest) => {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const { reservationId, roomId } = await body<{ reservationId: string; roomId: string }>(req);
  if (!reservationId || !roomId) return err("reservationId and roomId required");
  const tenantId = getTenantId();
  const now = new Date();
  const actor = actorFromRequest(guard.user, req.headers);

  const reservation = await prisma.hotelReservation.findFirst({
    where: { id: reservationId, tenantId },
  });
  if (!reservation) return err("Prenotazione non trovata", 404);

  if (reservation.status === "in_attesa") {
    return err("Confermare la prenotazione prima del check-in", 400);
  }

  if (reservation.status !== "confermata" && reservation.status !== "in_casa") {
    return err("La prenotazione non è in stato confermata o già in casa", 400);
  }

  const room = await prisma.hotelRoom.findFirst({
    where: { id: roomId, tenantId },
  });
  if (!room) return err("Camera non trovata", 404);

  if (!CHECKIN_ROOM_STATUSES.has(room.status) && reservation.roomId !== room.id) {
    return err(`Camera ${room.code} non disponibile (stato: ${room.status})`, 400);
  }

  if (!roomTypesMatch(room.roomType, reservation.roomType)) {
    return err(`Tipo camera non compatibile: prenotazione ${reservation.roomType}, camera ${room.roomType}`, 400);
  }

  const txResult = await prisma.$transaction(async (tx) => {
    const updatedReservation = await tx.hotelReservation.update({
      where: { id: reservation.id },
      data: { roomId: room.id, status: "in_casa" },
    });

    const updatedRoom = await tx.hotelRoom.update({
      where: { id: room.id },
      data: { status: "occupata" },
    });

    const stay = await tx.stay.upsert({
      where: { reservationId: reservation.id },
      update: { actualCheckInAt: now, actualCheckOutAt: null },
      create: { tenantId, reservationId: reservation.id, actualCheckInAt: now },
      select: {
        id: true,
        reservationId: true,
        reservation: { select: { roomId: true } },
        actualCheckInAt: true,
        actualCheckOutAt: true,
      },
    });

    const folio = await tx.guestFolio.upsert({
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
      select: { id: true },
    });

    await tx.hotelKeycard.updateMany({
      where: { tenantId, reservationId: reservation.id, status: "attiva" },
      data: { status: "annullata" },
    });

    const validUntil = new Date(updatedReservation.checkOutDate);
    validUntil.setUTCHours(11, 0, 0, 0);

    const card = await tx.hotelKeycard.create({
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
        lockCredentialId: true,
        encodedAt: true,
      },
    });

    return { updatedReservation, updatedRoom, stay, folio, card, validUntil };
  });

  await postRoomChargesOnCheckIn({
    tenantId,
    folioId: txResult.folio.id,
    nights: txResult.updatedReservation.nights,
    rate: txResult.updatedReservation.rate.toNumber(),
    roomCode: room.code,
    actor,
  }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("checkin_room_charge_failed", { reservationId: reservation.id, folioId: txResult.folio.id, error: message });
  });

  const deposit = txResult.updatedReservation.depositReceived?.toNumber() ?? 0;
  if (deposit > 0) {
    await postDepositOnCheckIn({
      tenantId,
      folioId: txResult.folio.id,
      reservationId: reservation.id,
      amount: deposit,
      actor,
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("checkin_deposit_failed", { reservationId: reservation.id, folioId: txResult.folio.id, error: message });
    });
  }

  await guestRegisterRepository.upsertFromReservation({
    tenantId,
    reservationId: reservation.id,
    stayId: txResult.stay.id,
    roomId: room.id,
    roomCode: room.code,
    actor,
  }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("checkin_guest_register_failed", { reservationId: reservation.id, error: message });
  });

  let finalCard = txResult.card;
  const config = await complianceRepository.get(tenantId);
  if (config.lockEnabled && config.lockBridgeUrl.trim()) {
    const lockResult = await encodeLockCredential(
      config.lockBridgeUrl,
      config.lockBridgeApiKey,
      config.lockVendor,
      {
        roomCode: room.code,
        reservationId: reservation.id,
        validFrom: now.toISOString(),
        validUntil: txResult.validUntil.toISOString(),
        guestName: txResult.updatedReservation.guestName,
      },
    );
    if (lockResult.success && lockResult.credentialId) {
      finalCard = await prisma.hotelKeycard.update({
        where: { id: txResult.card.id },
        data: { lockCredentialId: lockResult.credentialId, encodedAt: now },
        select: {
          id: true,
          roomId: true,
          reservationId: true,
          validFrom: true,
          validUntil: true,
          status: true,
          issuedBy: true,
          lockCredentialId: true,
          encodedAt: true,
        },
      });
      dispatchPrintJobAsync(tenantId, "keycard_emessa", "reception", [
        `CHECK-IN — Camera ${room.code}`,
        txResult.updatedReservation.guestName,
        lockResult.credentialId,
      ]);
    }
  }

  return ok({
    reservation: mapReservation(txResult.updatedReservation),
    room: mapRoom(txResult.updatedRoom),
    stay: mapStay(txResult.stay),
    card: mapCard(finalCard),
  });
});
