import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import {
  actorFromRequest,
  transferFolioCharge,
  updateChargeSplit,
  voidFolioCharge,
} from "@/lib/hotel/folio-service";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{
    action: "transfer" | "split" | "void";
    targetFolioId?: string;
    splitCode?: string;
  }>(req);
  const actor = actorFromRequest(guard.user, req.headers);

  try {
    if (payload.action === "transfer") {
      if (!payload.targetFolioId) return err("targetFolioId required", 400);
      await transferFolioCharge({ tenantId, chargeId: id, targetFolioId: payload.targetFolioId, actor });
    } else if (payload.action === "split") {
      if (!payload.splitCode) return err("splitCode required", 400);
      await updateChargeSplit({ tenantId, chargeId: id, splitCode: payload.splitCode, actor });
    } else if (payload.action === "void") {
      await voidFolioCharge({ tenantId, chargeId: id, actor });
    } else {
      return err("Invalid action", 400);
    }
    return ok({ success: true });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Operazione non riuscita", 400);
  }
}
