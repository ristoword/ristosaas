import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import type { HotelReservation } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const updates = await body<Partial<HotelReservation>>(req);
  const updated = db.hotel.reservations.update(id, updates);
  if (!updated) return err("Reservation not found", 404);
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const existing = db.hotel.reservations.get(id);
  if (!existing) return err("Reservation not found", 404);
  db.hotel.reservations.delete(id);
  return ok({ deleted: true });
}
