import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { authUsersRepository } from "@/lib/db/repositories/auth-users.repository";

const ADMIN_ROLES = ["super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;
  const limit = Number(req.nextUrl.searchParams.get("limit") || 100);
  const offset = Number(req.nextUrl.searchParams.get("offset") || 0);
  const tenantId = req.nextUrl.searchParams.get("tenantId") || undefined;
  return ok(
    await authUsersRepository.listUsers({
      tenantId,
      limit: Number.isFinite(limit) ? limit : 100,
      offset: Number.isFinite(offset) ? offset : 0,
    }),
  );
}
