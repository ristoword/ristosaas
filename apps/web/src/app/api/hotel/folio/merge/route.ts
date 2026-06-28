import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { actorFromRequest, mergeFolios } from "@/lib/hotel/folio-service";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{ sourceFolioId: string; targetFolioId: string }>(req);
  if (!payload.sourceFolioId || !payload.targetFolioId) return err("sourceFolioId and targetFolioId required", 400);
  try {
    await mergeFolios({
      tenantId,
      sourceFolioId: payload.sourceFolioId,
      targetFolioId: payload.targetFolioId,
      actor: actorFromRequest(guard.user, req.headers),
    });
    const target = await prisma.guestFolio.findFirst({ where: { id: payload.targetFolioId, tenantId } });
    return ok({ merged: true, targetFolioId: payload.targetFolioId, balance: target?.balance.toNumber() ?? 0 });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Merge fallito", 400);
  }
}
