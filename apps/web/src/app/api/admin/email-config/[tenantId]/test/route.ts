import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { adminRepository } from "@/lib/db/repositories/admin.repository";

const ADMIN_ROLES = ["super_admin"] as const;
type Ctx = { params: Promise<{ tenantId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;
  const { tenantId } = await ctx.params;
  return ok(await adminRepository.testEmailConfig(tenantId, true));
}
