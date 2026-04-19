import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { aiProposalsRepository } from "@/lib/db/repositories/ai-proposals.repository";

const ALLOWED_ROLES = ["owner", "supervisor", "cucina", "magazzino", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ALLOWED_ROLES);
  if (guard.error) return guard.error;
  const tenantId = guard.user.tenantId || getTenantId();
  const statusParam = req.nextUrl.searchParams.get("status");
  const typeParam = req.nextUrl.searchParams.get("type");
  const limitParam = Number(req.nextUrl.searchParams.get("limit") || "30");
  const onlyOpen = req.nextUrl.searchParams.get("open") === "true";
  const proposals = await aiProposalsRepository.list(tenantId, {
    status: (statusParam as "draft" | "pending_review" | "approved" | "rejected" | "applied" | "cancelled" | null) || null,
    type:
      (typeParam as
        | "food_cost"
        | "warehouse"
        | "menu"
        | "pricing"
        | "manager_report"
        | "reorder"
        | "hotel_bridge"
        | null) || null,
    limit: Number.isFinite(limitParam) ? limitParam : 30,
    onlyOpen,
  });
  return ok({ proposals });
}

export async function POST() {
  return err("Use /api/ai/proposals/generate to create proposals", 405);
}
