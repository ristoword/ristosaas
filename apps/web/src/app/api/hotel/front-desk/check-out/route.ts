import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const HOTEL_ROLES = ["hotel_manager", "reception", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const { reservationId, cityTaxAmount = 0, paymentMethod = "card" } = await body<{
    reservationId: string;
    cityTaxAmount?: number;
    paymentMethod?: "cash" | "card" | "room_charge_settlement";
  }>(req);
  if (!reservationId) return err("reservationId required");

  const result = db.hotelCheckOut(reservationId);
  if (!result) return err("Reservation not found", 404);
  const folio = db.closeGuestFolioForCheckout({ reservationId, cityTaxAmount, paymentMethod });

  return ok({ ...result, folio });
}
