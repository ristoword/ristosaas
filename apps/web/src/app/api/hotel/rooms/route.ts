import { NextRequest } from "next/server";
import { body, err, ok, withErrorHandler} from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { hotelRoomsRepository } from "@/lib/db/repositories/hotel-rooms.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { HotelRoom } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "housekeeping", "owner", "super_admin"] as const;

export const GET = withErrorHandler(async (req) => {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const rooms = await hotelRoomsRepository.all(getTenantId());
  return ok(rooms);
});

export const POST = withErrorHandler(async (req) => {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const data = await body<Omit<HotelRoom, "id">>(req);
  if (!data.code?.trim()) return err("code required");
  const created = await hotelRoomsRepository.create(getTenantId(), data);
  return ok(created, 201);
});
