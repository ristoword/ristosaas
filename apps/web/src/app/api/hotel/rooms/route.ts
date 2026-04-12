import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import type { HotelRoom } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "housekeeping", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  return ok(db.hotel.rooms.all());
}

export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const data = await body<Omit<HotelRoom, "id">>(req);
  if (!data.code?.trim()) return err("code required");
  const created = db.hotel.rooms.create(data);
  return ok(created, 201);
}
