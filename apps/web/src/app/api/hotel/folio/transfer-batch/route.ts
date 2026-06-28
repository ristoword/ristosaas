import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { actorFromRequest, transferChargesBatch } from "@/lib/hotel/folio-service";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{ chargeIds: string[]; targetFolioId: string }>(req);
  if (!payload.chargeIds?.length || !payload.targetFolioId) return err("chargeIds and targetFolioId required", 400);
  try {
    await transferChargesBatch({
      tenantId,
      chargeIds: payload.chargeIds,
      targetFolioId: payload.targetFolioId,
      actor: actorFromRequest(guard.user, req.headers),
    });
    return ok({ transferred: payload.chargeIds.length });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Trasferimento fallito", 400);
  }
}
