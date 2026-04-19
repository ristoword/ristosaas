import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { hotelReservationsRepository } from "@/lib/db/repositories/hotel-reservations.repository";
import { hotelRatePlansRepository } from "@/lib/db/repositories/hotel-rate-plans.repository";
import { hotelRoomsRepository } from "@/lib/db/repositories/hotel-rooms.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { isRoomAvailableForRange } from "@/modules/hotel/domain/availability";
import type { HotelRoom, HotelStay } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const roomType = req.nextUrl.searchParams.get("roomType");
  const checkInDate = req.nextUrl.searchParams.get("checkInDate");
  const checkOutDate = req.nextUrl.searchParams.get("checkOutDate");
  if (!roomType || !checkInDate || !checkOutDate) return err("roomType, checkInDate and checkOutDate required");

  const tenantId = getTenantId();
  const [allRooms, reservations] = await Promise.all([
    hotelRoomsRepository.all(tenantId),
    hotelReservationsRepository.all(tenantId),
  ]);
  const stayRows: Array<{
    id: string;
    reservationId: string;
    reservation: { roomId: string | null };
    actualCheckInAt: Date | null;
    actualCheckOutAt: Date | null;
  }> = await prisma.stay.findMany({
    where: { tenantId },
    select: {
      id: true,
      reservationId: true,
      reservation: {
        select: {
          roomId: true,
        },
      },
      actualCheckInAt: true,
      actualCheckOutAt: true,
    },
  });
  const rooms = allRooms.filter((room: HotelRoom) => room.roomType === roomType);
  const stays: HotelStay[] = stayRows.map((stay: {
    id: string;
    reservationId: string;
    reservation: { roomId: string | null };
    actualCheckInAt: Date | null;
    actualCheckOutAt: Date | null;
  }) => ({
    id: stay.id,
    reservationId: stay.reservationId,
    roomId: stay.reservation.roomId ?? "",
    actualCheckInAt: stay.actualCheckInAt ? stay.actualCheckInAt.toISOString() : null,
    actualCheckOutAt: stay.actualCheckOutAt ? stay.actualCheckOutAt.toISOString() : null,
  }));
  const availableRooms = rooms.filter((room: HotelRoom) =>
    isRoomAvailableForRange(room, reservations, stays, checkInDate, checkOutDate),
  );
  const ratePlans = await hotelRatePlansRepository.filterByRoomType(tenantId, roomType);

  return ok({
    roomType,
    checkInDate,
    checkOutDate,
    availableCount: availableRooms.length,
    rooms: availableRooms,
    ratePlans,
  });
}
