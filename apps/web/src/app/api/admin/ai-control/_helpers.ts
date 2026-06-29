import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser, requirePartnerEnterpriseUser } from "@/lib/auth/guards";
import { resolveControlCenterPermissions } from "@/lib/ai/control-center/permissions";
import { buildAiEnterpriseControlCenter } from "@/lib/ai/control-center/service";
import { clientIpFromRequest } from "@/lib/security/rate-limit";

export async function GET(req: NextRequest) {
  const guard = await requirePartnerEnterpriseUser(req);
  if (guard.error) return guard.error;

  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenantId");
  const embeddingSearch = url.searchParams.get("q") ?? undefined;

  const payload = await buildAiEnterpriseControlCenter(guard.user!, {
    tenantId: tenantId || undefined,
    embeddingSearch,
  });
  return ok(payload);
}

export function requireControlMutate(req: NextRequest, user: NonNullable<Awaited<ReturnType<typeof requireApiUser>>["user"]>) {
  const perms = resolveControlCenterPermissions(user);
  if (!perms.canMutateAgents) {
    return err("Solo Super Admin può modificare la configurazione AI.", 403);
  }
  if (user.role !== "super_admin") {
    return err("Forbidden", 403);
  }
  return null;
}

export { clientIpFromRequest };
