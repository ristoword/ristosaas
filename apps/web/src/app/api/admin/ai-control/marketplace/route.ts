import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser, requirePartnerEnterpriseUser } from "@/lib/auth/guards";
import { aiControlAuditRepository, aiMarketplaceRepository } from "@/lib/db/repositories/ai-control.repository";
import { clientIpFromRequest, requireControlMutate } from "@/app/api/admin/ai-control/_helpers";

export async function GET(req: NextRequest) {
  const guard = await requirePartnerEnterpriseUser(req);
  if (guard.error) return guard.error;

  const url = new URL(req.url);
  const tenantId = guard.user!.role === "super_admin" ? url.searchParams.get("tenantId") ?? undefined : guard.user!.tenantId;
  const items = await aiMarketplaceRepository.listWithInstalls(tenantId);
  return ok({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ["super_admin"]);
  if (guard.error) return guard.error;
  const blocked = requireControlMutate(req, guard.user!);
  if (blocked) return blocked;

  const payload = await body<{ action?: string; marketplaceId?: string; tenantId?: string }>(req);
  if (!payload?.action || !payload.marketplaceId || !payload.tenantId) {
    return err("action, marketplaceId, tenantId required");
  }

  if (payload.action === "install") {
    const row = await aiMarketplaceRepository.install(payload.tenantId, payload.marketplaceId, guard.user!.id);
    await aiControlAuditRepository.record({
      tenantId: payload.tenantId,
      actorId: guard.user!.id,
      actorRole: guard.user!.role,
      actorEmail: guard.user!.email,
      operation: "marketplace.install",
      entityType: "AiMarketplaceAgent",
      entityId: payload.marketplaceId,
      newValue: row,
      ipAddress: clientIpFromRequest(req),
    });
    return ok({ install: row });
  }

  if (payload.action === "uninstall") {
    const row = await aiMarketplaceRepository.uninstall(payload.tenantId, payload.marketplaceId);
    await aiControlAuditRepository.record({
      tenantId: payload.tenantId,
      actorId: guard.user!.id,
      actorRole: guard.user!.role,
      actorEmail: guard.user!.email,
      operation: "marketplace.uninstall",
      entityType: "AiMarketplaceAgent",
      entityId: payload.marketplaceId,
      oldValue: row,
      ipAddress: clientIpFromRequest(req),
    });
    return ok({ install: row });
  }

  return err("Invalid action");
}
