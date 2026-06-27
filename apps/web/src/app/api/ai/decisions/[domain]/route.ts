import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { generateSingleDomainDecision } from "@/lib/ai/decisions/orchestrator";
import { isAiDecisionDomain } from "@/lib/ai/decisions/proposal-mapper";
import type { AiDecisionDomain } from "@/lib/ai/decisions/types";
import { getModuleDefinition, normalizeModuleId } from "@/lib/ai/modules/config";
import { getTenantId } from "@/lib/db/repositories/tenant-context";

/** Mappa slug modulo UI → dominio decisionale AI. */
const MODULE_TO_DOMAIN: Record<string, string> = {
  inventory: "inventory_depletion",
  magazzino: "inventory_depletion",
  foodcost: "food_cost",
  kitchen: "reorder",
  cucina: "reorder",
  cantina: "cantina_promo",
  staff: "staff_shifts",
  turni: "staff_shifts",
  hotel: "hotel_occupancy",
  reception: "hotel_occupancy",
  crm: "crm_vip",
  supervisor: "supervisor_anomaly",
  owner: "supervisor_anomaly",
  cassa: "pricing",
  sala: "staff_shifts",
};

type RouteContext = { params: Promise<{ domain: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { domain: slug } = await context.params;

  let decisionDomain = slug;
  if (!isAiDecisionDomain(slug)) {
    const mapped = MODULE_TO_DOMAIN[slug] ?? MODULE_TO_DOMAIN[normalizeModuleId(slug) ?? ""];
    if (mapped && isAiDecisionDomain(mapped)) {
      decisionDomain = mapped;
    } else {
      return err("Dominio decisionale non valido", 404);
    }
  }

  const moduleId = normalizeModuleId(slug);
  const roles = moduleId ? getModuleDefinition(moduleId).roles : ["owner", "supervisor", "super_admin"] as const;
  const guard = await requireApiUser(req, roles);
  if (guard.error) return guard.error;

  const tenantId = guard.user.tenantId || getTenantId();
  const enrich = req.nextUrl.searchParams.get("enrich") !== "false";
  const periodDays = Number(req.nextUrl.searchParams.get("periodDays") || 14);

  const decision = await generateSingleDomainDecision(tenantId, decisionDomain as AiDecisionDomain, {
    periodDays,
    locale: req.nextUrl.searchParams.get("locale") ?? undefined,
    enrich,
    signal: req.signal,
  });

  return ok(decision);
}

export async function POST(req: NextRequest, context: RouteContext) {
  return GET(req, context);
}
