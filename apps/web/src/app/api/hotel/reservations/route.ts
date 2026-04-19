import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { hotelReservationsRepository } from "@/lib/db/repositories/hotel-reservations.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { HotelReservation } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const reservations = await hotelReservationsRepository.all(getTenantId());
  return ok(reservations);
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const data = await body<Omit<HotelReservation, "id">>(req);
  if (!data.guestName?.trim()) return err("guestName required");
  const created = await hotelReservationsRepository.create(getTenantId(), data);
  return ok(created, 201);
}
