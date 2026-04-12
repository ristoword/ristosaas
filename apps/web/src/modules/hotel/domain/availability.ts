import type { HotelReservation, HotelRoom, HotelStay } from "@/modules/hotel/domain/types";

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && startB < endA;
}

export function isRoomOperationallyAvailable(room: HotelRoom) {
  return room.status === "libera" || room.status === "pulita";
}

export function isRoomAvailableForRange(
  room: HotelRoom,
  reservations: HotelReservation[],
  stays: HotelStay[],
  checkInDate: string,
  checkOutDate: string,
) {
  if (!isRoomOperationallyAvailable(room)) return false;

  const hasActiveStay = stays.some(
    (stay) =>
      stay.roomId === room.id &&
      stay.actualCheckInAt &&
      !stay.actualCheckOutAt,
  );
  if (hasActiveStay) return false;

  const hasOverlappingReservation = reservations.some(
    (reservation) =>
      reservation.roomId === room.id &&
      !["cancellata", "no_show", "check_out"].includes(reservation.status) &&
      overlaps(reservation.checkInDate, reservation.checkOutDate, checkInDate, checkOutDate),
  );

  return !hasOverlappingReservation;
}
