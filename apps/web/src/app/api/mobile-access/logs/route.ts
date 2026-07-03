import { NextRequest } from "next/server";
import { ok, withErrorHandler } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { mobileAccessService } from "@/lib/hotel/mobile-access-service";

const READ_ROLES = ["hotel_manager", "reception", "housekeeping", "supervisor", "owner", "super_admin"] as const;

export const GET = withErrorHandler(async (req: NextRequest) => {
  const guard = await requireApiUser(req, READ_ROLES);
  if (guard.error) return guard.error;

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "100");
  const logs = await mobileAccessService.listLogs(getTenantId(), limit);
  return ok({ logs });
});
