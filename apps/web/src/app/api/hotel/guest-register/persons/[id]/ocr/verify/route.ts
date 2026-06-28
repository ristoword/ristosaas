import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { actorFromRequest, guestRegisterRepository } from "@/lib/hotel/guest-register-service";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { mergeOcrIntoPerson } from "@/lib/hotel/guest-register-ocr";
import type { GuestRegisterPerson, OcrExtractedFields } from "@/modules/hotel/domain/guest-register-types";
import { prisma } from "@/lib/db/prisma";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id: personId } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{ applyOcr?: boolean; fields?: Partial<GuestRegisterPerson> }>(req);

  const person = await prisma.guestRegisterPerson.findFirst({ where: { id: personId, tenantId } });
  if (!person) return err("Ospite non trovato", 404);

  let updates: Partial<GuestRegisterPerson> = payload.fields ?? {};

  if (payload.applyOcr && person.ocrPayload) {
    const merged = mergeOcrIntoPerson({}, person.ocrPayload as OcrExtractedFields, true);
    updates = { ...merged, ...updates };
  }

  updates.ocrStatus = "verified";
  updates.ocrVerifiedAt = new Date().toISOString();

  const updated = await guestRegisterRepository.updatePerson(
    tenantId,
    personId,
    updates,
    actorFromRequest(guard.user, req.headers),
  );

  return ok({ person: updated });
}
