import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import {
  hotelReservationsRepository,
  type BookingListFilters,
} from "@/lib/db/repositories/hotel-reservations.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { HOTEL_BOOKING_CHANNELS } from "@/lib/hotel/booking-list";
import type { HotelBookingChannel, HotelReservationStatus } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;

const STATUSES: HotelReservationStatus[] = [
  "in_attesa",
  "confermata",
  "cancellata",
  "no_show",
];

function parseFilters(req: NextRequest): BookingListFilters {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const channel = sp.get("channel");
  return {
    status: status && STATUSES.includes(status as HotelReservationStatus)
      ? (status as HotelReservationStatus)
      : status === "all"
        ? "all"
        : undefined,
    channel:
      channel && HOTEL_BOOKING_CHANNELS.includes(channel as HotelBookingChannel)
        ? (channel as HotelBookingChannel)
        : channel === "all"
          ? "all"
          : undefined,
    search: sp.get("search") ?? undefined,
    dateFrom: sp.get("dateFrom") ?? undefined,
    dateTo: sp.get("dateTo") ?? undefined,
    includeCancelled: sp.get("includeCancelled") === "1",
    page: sp.get("page") ? parseInt(sp.get("page")!, 10) : undefined,
    pageSize: sp.get("pageSize") ? parseInt(sp.get("pageSize")!, 10) : undefined,
  };
}

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  try {
    const result = await hotelReservationsRepository.listBookingSheet(getTenantId(), parseFilters(req));
    return ok(result);
  } catch (e) {
    return err(e instanceof Error ? e.message : "booking list error", 400);
  }
}
