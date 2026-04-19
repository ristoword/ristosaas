import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { aiKitchenRepository } from "@/lib/db/repositories/ai-kitchen.repository";

const KITCHEN_PRICING_ROLES = ["cucina", "supervisor", "owner", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, KITCHEN_PRICING_ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const daysRaw = Number(req.nextUrl.searchParams.get("days") || "14");
  const days = Number.isFinite(daysRaw) ? Math.min(60, Math.max(1, Math.floor(daysRaw))) : 14;
  const snapshot = await aiKitchenRepository.operationalSnapshot(tenantId, days);
  return ok({
    generatedAt: snapshot.generatedAt,
    periodDays: snapshot.periodDays,
    foodCost: snapshot.foodCost,
    dynamicPricing: snapshot.dynamicPricing,
  });
}
