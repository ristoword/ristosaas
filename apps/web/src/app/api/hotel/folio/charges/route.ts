import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { actorFromRequest, postFolioCharge } from "@/lib/hotel/folio-service";
import type { FolioChargeSource } from "@prisma/client";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{
    folioId: string;
    source?: FolioChargeSource;
    description: string;
    amount: number;
    department?: string;
    section?: string;
    quantity?: number;
    unitPrice?: number;
    vatPct?: number;
    splitCode?: string;
  }>(req);

  if (!payload.folioId || !payload.description || payload.amount == null) {
    return err("folioId, description and amount required", 400);
  }

  try {
    const charge = await postFolioCharge({
      tenantId,
      folioId: payload.folioId,
      source: payload.source ?? "manual",
      description: payload.description,
      amount: payload.amount,
      department: payload.department,
      section: payload.section,
      quantity: payload.quantity,
      unitPrice: payload.unitPrice,
      vatPct: payload.vatPct,
      splitCode: payload.splitCode,
      actor: actorFromRequest(guard.user, req.headers),
    });
    return ok({ charge });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Errore addebito", 400);
  }
}
