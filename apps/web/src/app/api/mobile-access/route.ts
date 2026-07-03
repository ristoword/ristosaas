import { NextRequest } from "next/server";
import { err, ok, withErrorHandler } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { mobileAccessService } from "@/lib/hotel/mobile-access-service";
import type { AccessCredentialStatus } from "@/modules/hotel/domain/mobile-access-types";

const READ_ROLES = ["hotel_manager", "reception", "housekeeping", "supervisor", "owner", "super_admin"] as const;

export const GET = withErrorHandler(async (req: NextRequest) => {
  const guard = await requireApiUser(req, READ_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const status = req.nextUrl.searchParams.get("status") as AccessCredentialStatus | null;
  const roomId = req.nextUrl.searchParams.get("roomId") || undefined;
  const view = req.nextUrl.searchParams.get("view");

  if (view === "dashboard") {
    const dashboard = await mobileAccessService.getDashboard(tenantId);
    return ok({ dashboard });
  }

  const [dashboard, items] = await Promise.all([
    mobileAccessService.getDashboard(tenantId),
    mobileAccessService.list(tenantId, {
      status: status ?? undefined,
      roomId,
    }),
  ]);

  return ok({ dashboard, items });
});
