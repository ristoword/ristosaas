import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { actorFromRequest, guestRegisterRepository } from "@/lib/hotel/guest-register-service";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { GuestRegisterCountry } from "@/modules/hotel/domain/guest-register-types";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{ country?: GuestRegisterCountry }>(req);
  try {
    const transmission = await guestRegisterRepository.transmitEntry(
      tenantId,
      id,
      payload.country,
      actorFromRequest(guard.user, req.headers),
    );
    return ok({ transmission });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Trasmissione fallita", 400);
  }
}
