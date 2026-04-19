import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { getRequestUser } from "@/lib/auth/session";
import { authUsersRepository } from "@/lib/db/repositories/auth-users.repository";
import { isMaintenanceMode, isTenantBlocked } from "@/lib/db/repositories/platform.repository";

export async function GET(req: NextRequest) {
  const user = getRequestUser(req);
  if (!user) return err("User not found", 401);
  const validSession = await authUsersRepository.isSessionVersionValid(user.id, user.sessionVersion ?? 0);
  if (!validSession) return err("Session expired. Please login again.", 401);

  if (user.role !== "super_admin") {
    if (await isMaintenanceMode()) return err("Piattaforma in manutenzione. Riprova più tardi.", 503);
    if (await isTenantBlocked(user.tenantId)) return err("Struttura sospesa. Contatta l'assistenza.", 403);
  }

  return ok(user);
}
