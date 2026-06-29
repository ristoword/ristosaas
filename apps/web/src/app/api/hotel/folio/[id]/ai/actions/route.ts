import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { guestFolioRepository } from "@/lib/db/repositories/guest-folio.repository";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { actorFromRequest, writeFolioAudit } from "@/lib/hotel/folio-service";
import { analyzeFolio } from "@/lib/hotel/folio-ai-service";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor", "cassa"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;

  const { id: folioId } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{ actionId?: string; actionType?: string; confirmed?: boolean }>(req);

  if (!payload.confirmed) {
    return err("Conferma utente richiesta per eseguire azioni AI", 400);
  }

  const detail = await guestFolioRepository.getDetail(tenantId, folioId);
  if (!detail) return err("Folio not found", 404);

  const analysis = analyzeFolio({ detail, reservation: null, customer: null });
  const action = analysis.proposedActions.find((a) => a.id === payload.actionId);

  if (!action) {
    return err("Azione AI non trovata o non autorizzata", 404);
  }

  await writeFolioAudit({
    tenantId,
    folioId,
    action: `ai_action_${action.type}`,
    newValue: action.label,
    actor: actorFromRequest(guard.user, req.headers),
  });

  return ok({
    acknowledged: true,
    action: action.type,
    label: action.label,
    message: `Azione "${action.label}" preparata — eseguire manualmente dall'interfaccia folio.`,
    payload: action.payload,
  });
}
