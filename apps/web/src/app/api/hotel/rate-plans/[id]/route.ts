import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { hotelRatePlansRepository, type RatePlanInput } from "@/lib/db/repositories/hotel-rate-plans.repository";

const MANAGE_ROLES = ["hotel_manager", "owner", "super_admin"] as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiUser(req, MANAGE_ROLES);
  if (guard.error) return guard.error;

  const { id } = await params;
  const payload = await body<Partial<RatePlanInput>>(req);
  const plan = await hotelRatePlansRepository.update(getTenantId(), id, payload);
  if (!plan) return err("Listino non trovato", 404);
  return ok(plan);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiUser(req, MANAGE_ROLES);
  if (guard.error) return guard.error;

  const { id } = await params;
  const deleted = await hotelRatePlansRepository.delete(getTenantId(), id);
  if (!deleted) return err("Listino non trovato", 404);
  return ok({ deleted: true });
}
