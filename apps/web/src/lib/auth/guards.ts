import type { NextRequest } from "next/server";
import { err } from "@/lib/api/helpers";
import { canAccessWithRole, getApiRequiredRoles } from "@/lib/auth/rbac";
import { getRequestUser } from "@/lib/auth/session";
import type { PublicUser, UserRole } from "@/lib/auth/types";
import { isMaintenanceMode, isTenantBlocked } from "@/lib/db/repositories/platform.repository";
import { setTenantIdContext } from "@/lib/db/repositories/tenant-context";

export function hasRole(userRole: UserRole, requiredRoles: readonly string[]) {
  return canAccessWithRole(userRole, requiredRoles as readonly UserRole[]);
}

/**
 * Guard centrale per route API.
 *
 * Comportamento RBAC:
 *  1) Se `requiredRoles` viene passato esplicitamente, viene applicato
 *     come restrizione locale oltre al middleware edge (che ha gia'
 *     consultato API_ROLE_RULES). Utile quando il route handler ha
 *     restrizioni piu' strette del default matrix.
 *  2) Se NON viene passato, il guard legge automaticamente le regole
 *     dalla matrix centrale `API_ROLE_RULES` in rbac.ts, basandosi
 *     sul path della richiesta. Questo elimina il drift tra middleware
 *     edge e handler: entrambi usano la stessa fonte di verita'.
 */
export async function requireApiUser(req: NextRequest, requiredRoles?: readonly string[]) {
  const user = getRequestUser(req);
  if (!user) return { error: err("Unauthorized", 401), user: null as PublicUser | null };
  setTenantIdContext(user.tenantId);

  const pathname = (() => {
    try {
      return new URL(req.url).pathname;
    } catch {
      return "";
    }
  })();

  const effectiveRoles =
    requiredRoles && requiredRoles.length > 0 ? requiredRoles : getApiRequiredRoles(pathname) ?? undefined;

  if (effectiveRoles && effectiveRoles.length > 0 && !hasRole(user.role, effectiveRoles)) {
    return { error: err("Forbidden", 403), user: null as PublicUser | null };
  }

  if (user.role !== "super_admin") {
    if (await isMaintenanceMode()) {
      return { error: err("Piattaforma in manutenzione. Riprova più tardi.", 503), user: null as PublicUser | null };
    }
    if (await isTenantBlocked(user.tenantId)) {
      return { error: err("Struttura sospesa. Contatta l'assistenza.", 403), user: null as PublicUser | null };
    }
  }

  return { error: null, user };
}
