import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { actorFromRequest, guestRegisterRepository } from "@/lib/hotel/guest-register-service";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { GuestRegisterCountry, GuestRegisterEntryStatus } from "@/modules/hotel/domain/guest-register-types";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const detail = await guestRegisterRepository.getDetail(
    tenantId,
    id,
    actorFromRequest(guard.user, req.headers),
  );
  if (!detail) return err("Registrazione non trovata", 404);
  return ok(detail);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{
    transmissionCountry?: GuestRegisterCountry;
    notes?: string | null;
    status?: GuestRegisterEntryStatus;
  }>(req);
  try {
    const entry = await guestRegisterRepository.updateEntry(tenantId, id, payload, actorFromRequest(guard.user, req.headers));
    return ok({ entry });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Errore", 400);
  }
}
