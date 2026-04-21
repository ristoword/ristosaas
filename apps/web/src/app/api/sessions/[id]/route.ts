import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { userSessionsRepository } from "@/lib/db/repositories/user-sessions.repository";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Revoca una sessione puntuale. L'utente puo' revocare solo le
 * proprie sessioni; super admin puo' revocare qualsiasi sessione
 * del proprio tenant (utile quando un dispositivo viene perso).
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const { user } = guard;
  const { id } = await ctx.params;

  const existing = await userSessionsRepository.listAllForUser(user.id, 500).then((rows) =>
    rows.find((row) => row.id === id),
  );

  const canRevoke =
    (existing && existing.userId === user.id) ||
    (user.role === "super_admin" && user.tenantId);

  if (!existing && user.role !== "super_admin") {
    return err("Sessione non trovata", 404);
  }

  if (!canRevoke) return err("Non autorizzato a revocare questa sessione", 403);

  const revoked = await userSessionsRepository.revokeById(id, user.id);
  if (!revoked) return err("Sessione non trovata", 404);
  return ok({ session: revoked });
}
