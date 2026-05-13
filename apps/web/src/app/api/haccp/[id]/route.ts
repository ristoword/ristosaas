import { NextRequest } from "next/server";
import { ok, err, body, withErrorHandler} from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { haccpRepository, type HaccpEntryType } from "@/lib/db/repositories/haccp.repository";

const HACCP_ROLES = ["owner", "supervisor", "cucina", "pizzeria", "bar", "magazzino", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

export const PUT = withErrorHandler(async (req, ctx) => {
  const guard = await requireApiUser(req, HACCP_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const data = await body<{
    type?: HaccpEntryType;
    recordedAt?: string;
    location?: string;
    tempC?: number | null;
    operator?: string;
    notes?: string;
  }>(req);
  const updated = await haccpRepository.update(getTenantId(), id, data);
  if (!updated) return err("Rilevazione HACCP non trovata", 404);
  return ok(updated);
});

export const DELETE = withErrorHandler(async (req, ctx) => {
  const guard = await requireApiUser(req, HACCP_ROLES);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await haccpRepository.delete(getTenantId(), id);
  if (!deleted) return err("Rilevazione HACCP non trovata", 404);
  return ok({ deleted: true });
});
