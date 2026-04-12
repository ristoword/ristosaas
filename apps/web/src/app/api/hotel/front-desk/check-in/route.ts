import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const HOTEL_ROLES = ["hotel_manager", "reception", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const { reservationId, roomId } = await body<{ reservationId: string; roomId: string }>(req);
  if (!reservationId || !roomId) return err("reservationId and roomId required");

  const result = db.hotelCheckIn(reservationId, roomId, guard.user?.username || guard.user?.name || "operator");
  if (!result) return err("Reservation or room not found", 404);

  return ok(result);
}
