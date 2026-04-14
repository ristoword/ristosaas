import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { hotelReservationsRepository } from "@/lib/db/repositories/hotel-reservations.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { HotelReservation } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const updates = await body<Partial<HotelReservation>>(req);
  const updated = await hotelReservationsRepository.update(getTenantId(), id, updates);
  if (!updated) return err("Reservation not found", 404);
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await hotelReservationsRepository.delete(getTenantId(), id);
  if (!deleted) return err("Reservation not found", 404);
  return ok({ deleted: true });
}
