import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { hotelRatePlansRepository, type RatePlanInput } from "@/lib/db/repositories/hotel-rate-plans.repository";

const HOTEL_ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;
const MANAGE_ROLES = ["hotel_manager", "owner", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const roomType = req.nextUrl.searchParams.get("roomType");
  const all = req.nextUrl.searchParams.get("all") === "1";
  const plans = roomType
    ? await hotelRatePlansRepository.filterByRoomType(tenantId, roomType)
    : await hotelRatePlansRepository.all(tenantId, all);
  return ok(plans);
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, MANAGE_ROLES);
  if (guard.error) return guard.error;

  const payload = await body<RatePlanInput>(req);
  if (!payload.code?.trim() || !payload.name?.trim() || !payload.roomType?.trim()) {
    return err("code, name and roomType required", 400);
  }
  if (payload.nightlyRate == null || payload.nightlyRate < 0) {
    return err("nightlyRate must be a non-negative number", 400);
  }

  try {
    const plan = await hotelRatePlansRepository.create(getTenantId(), payload);
    return ok(plan);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore creazione listino";
    if (msg.includes("Unique constraint")) return err("Codice listino già esistente", 409);
    return err(msg, 400);
  }
}
