import { NextRequest } from "next/server";
import { body, err, ok, withErrorHandler } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { mobileAccessService } from "@/lib/hotel/mobile-access-service";

const WRITE_ROLES = ["hotel_manager", "reception", "supervisor", "owner", "super_admin"] as const;

export const POST = withErrorHandler(async (req: NextRequest) => {
  const guard = await requireApiUser(req, WRITE_ROLES);
  if (guard.error) return guard.error;

  const { credentialId } = await body<{ credentialId: string }>(req);
  if (!credentialId) return err("credentialId obbligatorio", 400);

  const result = await mobileAccessService.regenerateCredential(getTenantId(), credentialId, {
    userId: guard.user?.id,
    userName: guard.user?.name ?? guard.user?.username,
    userRole: guard.user?.role,
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return ok(result);
});
