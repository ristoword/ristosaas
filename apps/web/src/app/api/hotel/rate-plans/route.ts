import { NextRequest } from "next/server";
import { ok, withErrorHandler} from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { hotelRatePlansRepository } from "@/lib/db/repositories/hotel-rate-plans.repository";

const HOTEL_ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;

export const GET = withErrorHandler(async (req) => {
  const guard = await requireApiUser(req, HOTEL_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const roomType = req.nextUrl.searchParams.get("roomType");
  const plans = roomType
    ? await hotelRatePlansRepository.filterByRoomType(tenantId, roomType)
    : await hotelRatePlansRepository.all(tenantId);
  return ok(plans);
});
