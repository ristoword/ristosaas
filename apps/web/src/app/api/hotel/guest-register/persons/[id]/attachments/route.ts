import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { actorFromRequest, guestRegisterRepository } from "@/lib/hotel/guest-register-service";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import type { GuestRegisterAttachmentType } from "@/modules/hotel/domain/guest-register-types";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor"] as const;
const MAX_BYTES = 4 * 1024 * 1024;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id: personId } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{
    type: GuestRegisterAttachmentType;
    fileName: string;
    mimeType: string;
    dataBase64: string;
  }>(req);

  if (!payload.type || !payload.fileName || !payload.dataBase64) {
    return err("type, fileName and dataBase64 required", 400);
  }

  const person = await prisma.guestRegisterPerson.findFirst({ where: { id: personId, tenantId } });
  if (!person) return err("Ospite non trovato", 404);

  const raw = payload.dataBase64.includes(",") ? payload.dataBase64.split(",")[1]! : payload.dataBase64;
  if (Math.ceil((raw.length * 3) / 4) > MAX_BYTES) return err("File troppo grande (max 4MB)", 400);

  const attachment = await guestRegisterRepository.saveAttachment({
    tenantId,
    entryId: person.entryId,
    personId,
    type: payload.type,
    fileName: payload.fileName,
    mimeType: payload.mimeType || "application/octet-stream",
    dataBase64: payload.dataBase64,
    actor: actorFromRequest(guard.user, req.headers),
  });

  return ok({ attachment }, 201);
}
