import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const NOTE_ROLES = [
  "cucina", "pizzeria", "bar", "sala", "cassa",
  "supervisor", "owner", "super_admin",
] as const;

type Ctx = { params: Promise<{ id: string }> };

/** DELETE /api/operational-notes/:id */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...NOTE_ROLES]);
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const tenantId = getTenantId();

  const existing = await prisma.operationalNote.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) return err("Nota non trovata", 404);

  await prisma.operationalNote.delete({ where: { id } });
  return ok({ deleted: true });
}
