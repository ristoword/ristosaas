import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import type { HotelReservation } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  return ok(db.hotel.reservations.all());
}

export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const data = await body<Omit<HotelReservation, "id">>(req);
  if (!data.guestName?.trim()) return err("guestName required");
  const created = db.hotel.reservations.create(data);
  return ok(created, 201);
}
