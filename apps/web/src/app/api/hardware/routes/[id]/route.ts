import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { hardwareRepository } from "@/lib/db/repositories/hardware.repository";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await hardwareRepository.deleteRoute(getTenantId(), id);
  if (!deleted) return err("Rotta non trovata", 404);
  return ok({ deleted: true });
}
