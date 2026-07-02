import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { hotelReservationsRepository } from "@/lib/db/repositories/hotel-reservations.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { HotelReservation } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  try {
    const updates = await body<Partial<HotelReservation>>(req);
    const updated = await hotelReservationsRepository.update(getTenantId(), id, updates);
    if (!updated) return err("Reservation not found", 404);
    return ok(updated);
  } catch (e) {
    return err(e instanceof Error ? e.message : "update failed", 400);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  try {
    const deleted = await hotelReservationsRepository.delete(getTenantId(), id);
    if (!deleted) return err("Reservation not found", 404);
    return ok({ deleted: true });
  } catch (e) {
    return err(e instanceof Error ? e.message : "delete failed", 400);
  }
}
