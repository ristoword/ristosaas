import { prisma } from "@/lib/db/prisma";

/**
 * Legacy UI/API context keys → AiAgent.module for DB lookup.
 * Routing target slug is resolved dynamically from active tenant agents.
 */
const CONTEXT_MODULE_ALIASES: Record<string, string> = {
  reception: "reception",
  hotel: "hotel",
  folio: "hotel",
  "guest-folio": "hotel",
  prenotazioni: "prenotazioni",
  bookings: "prenotazioni",
  booking: "prenotazioni",
  housekeeping: "housekeeping",
  dashboard: "dashboard",
  revenue: "dashboard",
  supervisor: "dashboard",
  accounting: "dashboard",
  crm: "crm",
  marketing: "crm",
  cassa: "crm",
  sala: "crm",
  kitchen: "kitchen",
  cucina: "kitchen",
  risto: "kitchen",
  pizzeria: "kitchen",
  foodcost: "foodcost",
  food_cost: "foodcost",
  cantina: "cantina",
  bar: "cantina",
  magazzino: "magazzino",
  inventory: "magazzino",
  purchasing: "magazzino",
  staff: "staff",
  maintenance: "general",
  general: "general",
  haccp: "haccp",
  default: "general",
};

function scoreAgent(agent: { slug: string; module: string }, normalized: string, moduleAlias: string): number {
  if (agent.slug === normalized) return 100;
  if (agent.slug === `${normalized}-ai`) return 95;
  if (normalized.endsWith("-ai") && agent.slug === normalized) return 100;
  if (agent.slug.includes(normalized) && normalized.length >= 3) return 80;
  if (agent.module === moduleAlias) return 60;
  if (agent.module === normalized) return 55;
  return 0;
}

/**
 * Resolves agent slug from active tenant agents in DB (no static slug map).
 */
export async function routeContextToAgentSlug(tenantId: string, context: string): Promise<string> {
  const normalized = context.trim().toLowerCase();
  const moduleAlias = CONTEXT_MODULE_ALIASES[normalized] ?? normalized;

  const candidates = await prisma.aiAgent.findMany({
    where: {
      tenantId,
      active: true,
      OR: [
        { slug: normalized },
        { slug: `${normalized}-ai` },
        { slug: { contains: normalized, mode: "insensitive" } },
        { module: moduleAlias },
        { module: normalized },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  if (candidates.length > 0) {
    const best = candidates.reduce((a, b) =>
      scoreAgent(b, normalized, moduleAlias) > scoreAgent(a, normalized, moduleAlias) ? b : a,
    );
    if (scoreAgent(best, normalized, moduleAlias) > 0) return best.slug;
  }

  const maintenance = await prisma.aiAgent.findFirst({
    where: { tenantId, slug: "maintenance-ai", active: true },
  });
  if (maintenance) return maintenance.slug;

  const anyActive = await prisma.aiAgent.findFirst({
    where: { tenantId, active: true },
    orderBy: { updatedAt: "desc" },
  });
  if (anyActive) return anyActive.slug;

  return normalized.endsWith("-ai") ? normalized : "maintenance-ai";
}

export async function routeContextToModule(tenantId: string, context: string): Promise<string> {
  const slug = await routeContextToAgentSlug(tenantId, context);
  const agent = await prisma.aiAgent.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
    select: { module: true },
  });
  if (agent?.module) return agent.module;
  return CONTEXT_MODULE_ALIASES[context.trim().toLowerCase()] ?? context;
}
