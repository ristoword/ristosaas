import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { actorFromRequest, setFolioLocked } from "@/lib/hotel/folio-service";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = guard.user.tenantId || getTenantId();
  try {
    await setFolioLocked({
      tenantId,
      folioId: id,
      locked: true,
      actor: actorFromRequest(guard.user, req.headers),
    });
    return ok({ locked: true });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Errore", 400);
  }
}
