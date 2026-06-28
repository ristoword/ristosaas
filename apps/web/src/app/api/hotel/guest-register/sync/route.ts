import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { actorFromRequest, guestRegisterRepository } from "@/lib/hotel/guest-register-service";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { todayIso } from "@/lib/date-utils";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor"] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const date = req.nextUrl.searchParams.get("date") || todayIso();
  const entries = await guestRegisterRepository.syncToday(tenantId, date, actorFromRequest(guard.user, req.headers));
  return ok({ synced: entries.length, entries });
}
