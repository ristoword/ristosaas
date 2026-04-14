import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { hotelRatePlansRepository } from "@/lib/db/repositories/hotel-rate-plans.repository";

const HOTEL_ROLES = ["hotel_manager", "reception", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const roomType = req.nextUrl.searchParams.get("roomType");
  const plans = roomType
    ? await hotelRatePlansRepository.filterByRoomType(tenantId, roomType)
    : await hotelRatePlansRepository.all(tenantId);
  return ok(plans);
}
