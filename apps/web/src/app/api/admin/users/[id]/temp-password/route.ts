import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { authUsersRepository } from "@/lib/db/repositories/auth-users.repository";
import { recordAdminAudit } from "@/lib/observability/admin-audit";

const ADMIN_ROLES = ["super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const result = await authUsersRepository.generateTemporaryPassword(id);
  if (!result) return err("User not found", 404);
  void recordAdminAudit({
    action: "user.temp_password",
    actor: guard.user,
    targetId: id,
    metadata: { targetEmail: result.user?.email ?? null },
    req,
  });
  return ok(result);
}
