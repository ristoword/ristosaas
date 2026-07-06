import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { reservationGroupsRepository } from "@/lib/db/repositories/hotel-reservations.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";

const HOTEL_ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const group = await reservationGroupsRepository.get(getTenantId(), id);
  if (!group) return err("Group not found", 404);
  return ok(group);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  try {
    const data = await body<{
      name?: string;
      contactPerson?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      company?: string | null;
      checkInDate?: string;
      checkOutDate?: string;
      notes?: string | null;
      status?: "tentative" | "confirmed" | "cancelled";
    }>(req);
    const updated = await reservationGroupsRepository.update(getTenantId(), id, data);
    if (!updated) return err("Group not found", 404);
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
    const deleted = await reservationGroupsRepository.delete(getTenantId(), id);
    if (!deleted) return err("Group not found", 404);
    return ok({ deleted: true });
  } catch (e) {
    return err(e instanceof Error ? e.message : "delete failed", 400);
  }
}
