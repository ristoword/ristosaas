import { NextRequest } from "next/server";
import { err, ok, withErrorHandler } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { mobileAccessService } from "@/lib/hotel/mobile-access-service";

const READ_ROLES = ["hotel_manager", "reception", "housekeeping", "supervisor", "owner", "super_admin"] as const;

export const GET = withErrorHandler(async (req: NextRequest, ctx) => {
  const guard = await requireApiUser(req, READ_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const item = await mobileAccessService.getById(getTenantId(), id);
  if (!item) return err("Credenziale non trovata", 404);
  return ok(item);
});
