import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const INTEGRATION_ROLES = ["hotel_manager", "reception", "cassa", "supervisor", "owner", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, INTEGRATION_ROLES);
  if (guard.error) return guard.error;

  const { reservationId, orderId, description, amount } = await body<{
    reservationId: string;
    orderId: string;
    description: string;
    amount: number;
  }>(req);

  if (!reservationId || !orderId || !description || !amount) return err("reservationId, orderId, description and amount required");
  const result = db.postRestaurantChargeToRoom({ reservationId, orderId, description, amount });
  if (!result) return err("Reservation not found", 404);

  return ok(result);
}
