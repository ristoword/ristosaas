import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { actorFromRequest, guestRegisterRepository } from "@/lib/hotel/guest-register-service";
import { getTenantId } from "@/lib/db/repositories/tenant-context";

const ROLES = ["hotel_manager", "reception", "owner", "super_admin", "supervisor"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const sp = req.nextUrl.searchParams;
  const result = await guestRegisterRepository.search(tenantId, {
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 50,
    status: (sp.get("status") as "draft" | "incomplete" | "complete" | "checked_out") || undefined,
  });
  return ok(result);
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<{ reservationId: string }>(req);
  if (!payload.reservationId) return err("reservationId required", 400);
  try {
    const entry = await guestRegisterRepository.upsertFromReservation({
      tenantId,
      reservationId: payload.reservationId,
      actor: actorFromRequest(guard.user, req.headers),
    });
    return ok({ entry }, 201);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Errore", 400);
  }
}
