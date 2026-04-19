import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { adminRepository } from "@/lib/db/repositories/admin.repository";

const ADMIN_ROLES = ["super_admin"] as const;
type Ctx = { params: Promise<{ tenantId: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ADMIN_ROLES);
  if (guard.error) return guard.error;
  const { tenantId } = await ctx.params;
  const payload = await body<{
    host: string;
    port: number;
    username: string;
    password: string;
    fromAddress: string;
    secure: boolean;
  }>(req);
  if (!payload.host || !payload.username || !payload.fromAddress) return err("invalid payload");
  try {
    return ok(await adminRepository.upsertEmailConfig(tenantId, payload));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed";
    return err(message, 400);
  }
}
