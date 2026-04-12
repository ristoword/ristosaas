import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import type { HotelRoom } from "@/modules/hotel/domain/types";

const HOTEL_ROLES = ["hotel_manager", "reception", "housekeeping", "super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const updates = await body<Partial<HotelRoom>>(req);
  const updated = db.hotel.rooms.update(id, updates);
  if (!updated) return err("Room not found", 404);
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const existing = db.hotel.rooms.get(id);
  if (!existing) return err("Room not found", 404);
  db.hotel.rooms.delete(id);
  return ok({ deleted: true });
}
