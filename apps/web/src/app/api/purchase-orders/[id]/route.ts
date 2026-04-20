import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { purchaseOrdersRepository } from "@/lib/db/repositories/purchase-orders.repository";

const ROLES = ["owner", "supervisor", "magazzino", "cassa", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const row = await purchaseOrdersRepository.get(getTenantId(), id);
  if (!row) return err("Ordine non trovato.", 404);
  return ok(row);
}

/** PATCH /api/purchase-orders/:id — cambia stato (es. bozza -> inviato). */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const payload = await body<{ status?: "bozza" | "inviato" | "annullato" }>(req);
  if (!payload?.status) return err("status e obbligatorio.", 400);

  try {
    if (payload.status === "annullato") {
      const row = await purchaseOrdersRepository.cancel(getTenantId(), id);
      if (!row) return err("Ordine non trovato.", 404);
      return ok(row);
    }
    const row = await purchaseOrdersRepository.setStatus(getTenantId(), id, payload.status);
    if (!row) return err("Ordine non trovato.", 404);
    return ok(row);
  } catch (error) {
    return err(error instanceof Error ? error.message : "Aggiornamento fallito.", 400);
  }
}
