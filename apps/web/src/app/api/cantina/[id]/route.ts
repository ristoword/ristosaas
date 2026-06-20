import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { wineCellarRepository, type WineCellarUpdatePayload } from "@/lib/db/repositories/wine-cellar.repository";

const CANTINA_ROLES = ["owner", "supervisor", "sala", "bar", "cassa", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, CANTINA_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const data = await body<WineCellarUpdatePayload>(req);
  const updated = await wineCellarRepository.update(getTenantId(), id, data);
  if (!updated) return err("Vino non trovato", 404);
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, CANTINA_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await wineCellarRepository.delete(getTenantId(), id);
  if (!deleted) return err("Vino non trovato", 404);
  return ok({ deleted: true });
}
