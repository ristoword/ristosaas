import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { actorFromRequest, guestRegisterRepository } from "@/lib/hotel/guest-register-service";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { GuestRegisterPerson } from "@/modules/hotel/domain/guest-register-types";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<Partial<GuestRegisterPerson>>(req);
  try {
    const person = await guestRegisterRepository.updatePerson(tenantId, id, payload, actorFromRequest(guard.user, req.headers));
    return ok({ person });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Errore", 400);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  try {
    await guestRegisterRepository.deletePerson(tenantId, id, actorFromRequest(guard.user, req.headers));
    return ok({ deleted: true });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Errore", 400);
  }
}
