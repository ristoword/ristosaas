import { NextRequest } from "next/server";
import { body, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { generateAiDecisions } from "@/lib/ai/decisions/orchestrator";
import type { AiDecisionGenerateRequest } from "@/lib/ai/decisions/types";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { sendOperationalAlert } from "@/lib/observability/alerts";

const ALLOWED_ROLES = [
  "owner",
  "supervisor",
  "cucina",
  "magazzino",
  "hotel_manager",
  "reception",
  "sala",
  "cassa",
  "super_admin",
] as const;

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, ALLOWED_ROLES);
  if (guard.error) return guard.error;

  const tenantId = guard.user.tenantId || getTenantId();
  const payload = await body<AiDecisionGenerateRequest>(req);

  const result = await generateAiDecisions(tenantId, guard.user.id, {
    domains: payload.domains,
    periodDays: payload.periodDays,
    locale: payload.locale,
    persist: payload.persist ?? true,
    status: payload.status ?? "pending_review",
  });

  if (result.proposals?.length) {
    await sendOperationalAlert({
      key: `ai-decisions-pending-${tenantId}`,
      title: "Nuove decisioni AI da approvare",
      message: `Generate ${result.proposals.length} decisioni (${result.source}) per tenant ${tenantId}.`,
      severity: "warning",
      metadata: {
        tenantId,
        domains: payload.domains ?? "all",
        source: result.source,
        generatedBy: guard.user.id,
      },
    });
  }

  return ok(result);
}

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ALLOWED_ROLES);
  if (guard.error) return guard.error;

  const tenantId = guard.user.tenantId || getTenantId();
  const domainsParam = req.nextUrl.searchParams.get("domains");
  const domains = domainsParam
    ? (domainsParam.split(",").map((d) => d.trim()) as AiDecisionGenerateRequest["domains"])
    : undefined;

  const result = await generateAiDecisions(tenantId, guard.user.id, {
    domains,
    periodDays: Number(req.nextUrl.searchParams.get("periodDays") || 14),
    locale: req.nextUrl.searchParams.get("locale") ?? undefined,
    persist: false,
  });

  return ok(result);
}
