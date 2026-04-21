import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { userSessionsRepository } from "@/lib/db/repositories/user-sessions.repository";

/**
 * Lista delle sessioni dell'utente autenticato.
 * Super admin puo' passare ?scope=tenant per vedere tutte le sessioni
 * attive del proprio tenant (utile per audit rapido).
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const { user } = guard;

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "self";
  const activeOnly = url.searchParams.get("active") === "true";

  if (scope === "tenant" && user.role === "super_admin") {
    if (!user.tenantId) return ok({ sessions: [], self: user.jti ?? null });
    const rows = await userSessionsRepository.listForTenant(user.tenantId, {
      activeOnly,
      limit: 200,
    });
    return ok({ sessions: rows, self: user.jti ?? null });
  }

  const rows = activeOnly
    ? await userSessionsRepository.listActiveForUser(user.id)
    : await userSessionsRepository.listAllForUser(user.id, 100);
  return ok({ sessions: rows, self: user.jti ?? null });
}
