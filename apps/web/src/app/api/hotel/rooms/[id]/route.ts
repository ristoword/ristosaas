import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { hotelRoomsRepository } from "@/lib/db/repositories/hotel-rooms.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { HotelRoom } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "housekeeping", "super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const updates = await body<Partial<HotelRoom>>(req);
  const updated = await hotelRoomsRepository.update(getTenantId(), id, updates);
  if (!updated) return err("Room not found", 404);
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await hotelRoomsRepository.delete(getTenantId(), id);
  if (!deleted) return err("Room not found", 404);
  return ok({ deleted: true });
}
