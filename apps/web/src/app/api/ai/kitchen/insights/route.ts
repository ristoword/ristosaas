import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { aiKitchenRepository } from "@/lib/db/repositories/ai-kitchen.repository";

const KITCHEN_AI_ROLES = ["owner", "supervisor", "cucina", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, KITCHEN_AI_ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const periodDaysRaw = Number(req.nextUrl.searchParams.get("days") || "14");
  const periodDays = Number.isFinite(periodDaysRaw) ? Math.min(60, Math.max(1, Math.floor(periodDaysRaw))) : 14;
  const mode = (req.nextUrl.searchParams.get("mode") || "basic").toLowerCase();
  if (mode === "operational") {
    const snapshot = await aiKitchenRepository.operationalSnapshot(tenantId, periodDays);
    return ok(snapshot);
  }
  const snapshot = await aiKitchenRepository.snapshot(tenantId, periodDays);
  return ok(snapshot);
}
