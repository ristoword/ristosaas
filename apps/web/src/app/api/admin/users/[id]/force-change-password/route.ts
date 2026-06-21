import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { recordAdminAudit } from "@/lib/observability/admin-audit";
import { authUsersRepository } from "@/lib/db/repositories/auth-users.repository";

const ADMIN_ROLES = ["super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, mustChangePassword: true } });
  if (!user) return err("User not found", 404);

  const updated = await prisma.user.update({
    where: { id },
    data: { mustChangePassword: !user.mustChangePassword },
    select: {
      id: true, tenantId: true, username: true, passwordHash: true,
      name: true, role: true, email: true, partnerCode: true,
      sessionVersion: true, mustChangePassword: true,
      failedLoginAttempts: true, lockedUntil: true,
    },
  });

  void recordAdminAudit({
    action: "user.force_change_password",
    actor: guard.user,
    targetId: id,
    metadata: { mustChangePassword: updated.mustChangePassword },
    req,
  });

  return ok({ user: authUsersRepository.sanitizeUser(updated) });
}
