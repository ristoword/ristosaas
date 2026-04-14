import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { authUsersRepository } from "@/lib/db/repositories/auth-users.repository";

const ADMIN_ROLES = ["super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const result = await authUsersRepository.generateTemporaryPassword(id);
  if (!result) return err("User not found", 404);
  return ok(result);
}
