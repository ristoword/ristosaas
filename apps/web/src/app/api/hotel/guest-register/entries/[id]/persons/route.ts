import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { actorFromRequest, guestRegisterRepository } from "@/lib/hotel/guest-register-service";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import type { GuestRegisterPerson } from "@/modules/hotel/domain/guest-register-types";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id: entryId } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<Partial<GuestRegisterPerson>>(req);
  try {
    const person = await guestRegisterRepository.addPerson(tenantId, entryId, payload, actorFromRequest(guard.user, req.headers));
    return ok({ person }, 201);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Errore", 400);
  }
}
