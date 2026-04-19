import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { adminRepository } from "@/lib/db/repositories/admin.repository";

const ADMIN_ROLES = ["super_admin"] as const;
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const { status } = await body<{ status: "trial" | "active" | "expired" | "suspended" }>(req);
  if (!status) return err("status is required");
  return ok(await adminRepository.setLicenseStatus(id, status));
}
