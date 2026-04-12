import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { isRoomAvailableForRange } from "@/modules/hotel/domain/availability";

const HOTEL_ROLES = ["hotel_manager", "reception", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const roomType = req.nextUrl.searchParams.get("roomType");
  const checkInDate = req.nextUrl.searchParams.get("checkInDate");
  const checkOutDate = req.nextUrl.searchParams.get("checkOutDate");
  if (!roomType || !checkInDate || !checkOutDate) return err("roomType, checkInDate and checkOutDate required");

  const rooms = db.hotel.rooms.all().filter((room) => room.roomType === roomType);
  const reservations = db.hotel.reservations.all();
  const stays = db.hotel.stays.all();
  const availableRooms = rooms.filter((room) =>
    isRoomAvailableForRange(room, reservations, stays, checkInDate, checkOutDate),
  );
  const ratePlans = db.hotel.ratePlans.filterByRoomType(roomType);

  return ok({
    roomType,
    checkInDate,
    checkOutDate,
    availableCount: availableRooms.length,
    rooms: availableRooms,
    ratePlans,
  });
}
