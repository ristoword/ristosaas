import type { HotelBookingChannel, HotelReservationStatus } from "@/modules/hotel/domain/types";

export const HOTEL_BOOKING_CHANNELS: HotelBookingChannel[] = ["online", "desk", "agency", "voucher"];

/** Stati visibili nel foglio lista prenotazioni (pre check-in / annullate). */
export const BOOKING_LIST_STATUSES: HotelReservationStatus[] = [
  "in_attesa",
  "confermata",
  "cancellata",
  "no_show",
];

export const CHECKED_IN_STATUSES: HotelReservationStatus[] = ["in_casa", "check_out"];

export function isOnBookingList(status: HotelReservationStatus): boolean {
  return BOOKING_LIST_STATUSES.includes(status);
}

export function canCheckIn(status: HotelReservationStatus): boolean {
  return status === "confermata";
}

export function canConfirm(status: HotelReservationStatus): boolean {
  return status === "in_attesa";
}

export function canCancel(status: HotelReservationStatus): boolean {
  return status === "in_attesa" || status === "confermata";
}

export function canEditOnBookingList(status: HotelReservationStatus): boolean {
  return status === "in_attesa" || status === "confermata";
}

export function defaultStatusForChannel(channel: HotelBookingChannel): HotelReservationStatus {
  return channel === "online" || channel === "agency" ? "in_attesa" : "confermata";
}

export function channelRequiresVoucher(channel: HotelBookingChannel): boolean {
  return channel === "voucher";
}
