import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { actorFromRequest, guestRegisterRepository } from "@/lib/hotel/guest-register-service";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { runOcrOnDocument } from "@/lib/hotel/guest-register-ocr";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id: personId } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{ dataBase64: string; mimeType: string; fileName: string }>(req);

  const person = await prisma.guestRegisterPerson.findFirst({ where: { id: personId, tenantId } });
  if (!person) return err("Ospite non trovato", 404);

  await guestRegisterRepository.updatePerson(
    tenantId,
    personId,
    { ocrStatus: "pending" },
    actorFromRequest(guard.user, req.headers),
  );

  try {
    const extracted = await runOcrOnDocument(payload);
    const personUpdated = await guestRegisterRepository.updatePerson(
      tenantId,
      personId,
      { ocrStatus: "completed", ocrPayload: extracted as Record<string, unknown> },
      actorFromRequest(guard.user, req.headers),
    );
    return ok({ extracted, person: personUpdated });
  } catch (e) {
    await guestRegisterRepository.updatePerson(tenantId, personId, { ocrStatus: "failed" });
    return err(e instanceof Error ? e.message : "OCR fallito", 400);
  }
}
