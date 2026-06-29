import { prisma } from "@/lib/db/prisma";
import { aiKitchenRepository } from "@/lib/db/repositories/ai-kitchen.repository";
import { aiCantinaRepository } from "@/lib/db/repositories/ai-cantina.repository";
import { customersRepository } from "@/lib/db/repositories/customers.repository";
import { supervisorStorniRepository } from "@/lib/db/repositories/supervisor-storni.repository";
import { unifiedReportsRepository } from "@/lib/db/repositories/unified-reports.repository";
import type { SupplementalContext } from "@/lib/ai/decisions/context-builder";
import { enrichRuleWithAi, ruleOnlyLayer } from "@/lib/ai/decisions/structured-enrich";
import type { AiDecisionDomain, AiDecisionEnvelope } from "@/lib/ai/decisions/types";

type EngineOptions = {
  tenantId: string;
  userId?: string;
  periodDays: number;
  locale?: string;
  enrich: boolean;
  supplemental: SupplementalContext;
  signal?: AbortSignal;
};

async function wrapDecision(
  domain: AiDecisionDomain,
  ruleSummary: string,
  ruleRecommendation: unknown,
  dataUsed: string[],
  options: EngineOptions,
): Promise<AiDecisionEnvelope> {
  const generatedAt = new Date().toISOString();
  let aiEnhanced = null;

  if (options.enrich) {
    aiEnhanced = await enrichRuleWithAi({
      domain,
      ruleBased: { summary: ruleSummary, recommendation: ruleRecommendation },
      supplementalContext: options.supplemental,
      locale: options.locale,
      signal: options.signal,
      tenantId: options.tenantId,
      userId: options.userId,
    });
  }

  if (!aiEnhanced && options.enrich) {
    aiEnhanced = ruleOnlyLayer(ruleRecommendation, dataUsed);
  }

  const reviewStatus =
    aiEnhanced && !aiEnhanced.fallbackToRule ? "pending_review" : "not_required";

  return {
    domain,
    generatedAt,
    ruleBased: { summary: ruleSummary, recommendation: ruleRecommendation, source: "rules" },
    aiEnhanced,
    reviewStatus,
  };
}

export async function engineReorder(options: EngineOptions): Promise<AiDecisionEnvelope> {
  const snapshot = await aiKitchenRepository.operationalSnapshot(options.tenantId, options.periodDays);
  const suggestions = snapshot.reorder;
  const summary =
    suggestions.length > 0
      ? suggestions
          .slice(0, 5)
          .map((i) => `${i.name}: ${i.suggestedOrderQty} ${i.unit}`)
          .join("; ")
      : "Nessun riordino rule-based";

  return wrapDecision(
    "reorder",
    summary,
    { items: suggestions, ruleFormula: "targetQty=max(minStock×2, avgDaily×5)" },
    ["consumption_14d", "minStock", "warehouse_movements", "bookings_7d", "hotel_tomorrow", "season"],
    options,
  );
}

export async function engineInventoryDepletion(options: EngineOptions): Promise<AiDecisionEnvelope> {
  const snapshot = await aiKitchenRepository.operationalSnapshot(options.tenantId, options.periodDays);
  const { stagnantProducts, expiringProducts } = snapshot.warehouse;
  const lowStock = snapshot.reorder.filter((r) => r.qty <= r.minStock);

  const summary = [
    ...expiringProducts.slice(0, 3).map((p) => `${p.name} scade in ${p.daysToExpire}g`),
    ...stagnantProducts.slice(0, 2).map((p) => `${p.name} fermo ${p.daysWithoutMovement}g`),
  ].join("; ") || "Nessun rischio esaurimento rule-based";

  return wrapDecision(
    "inventory_depletion",
    summary,
    { expiringProducts, stagnantProducts, lowStock, kpi: snapshot.kpi },
    ["expiring_lots", "stagnant_products", "reorder_rules", "sales_trend"],
    options,
  );
}

export async function engineFoodCost(options: EngineOptions): Promise<AiDecisionEnvelope> {
  const snapshot = await aiKitchenRepository.operationalSnapshot(options.tenantId, options.periodDays);
  const critical = snapshot.foodCost.filter((d) => d.status !== "healthy");
  const summary =
    critical.length > 0
      ? critical.slice(0, 5).map((d) => `${d.menuItem}: margine ${d.marginPct}%`).join("; ")
      : "Food cost nei parametri";

  return wrapDecision(
    "food_cost",
    summary,
    { dishes: critical.slice(0, 15), managerReport: snapshot.managerReport },
    ["recipe_costs", "demand", "margin_thresholds", "sales_trend"],
    options,
  );
}

export async function enginePricing(options: EngineOptions): Promise<AiDecisionEnvelope> {
  const snapshot = await aiKitchenRepository.operationalSnapshot(options.tenantId, options.periodDays);
  const suggestions = snapshot.dynamicPricing;
  const summary =
    suggestions.length > 0
      ? suggestions
          .slice(0, 5)
          .map((p) => `${p.menuItem}: ${p.currentPrice}→${p.suggestedPrice}`)
          .join("; ")
      : "Nessun adeguamento prezzo rule-based";

  return wrapDecision(
    "pricing",
    summary,
    { suggestions, foodCostHealthy: snapshot.foodCost.filter((d) => d.status === "healthy").length },
    ["dynamic_pricing_rules", "demand_qty", "bookings_7d", "season"],
    options,
  );
}

export async function engineStaffShifts(options: EngineOptions): Promise<AiDecisionEnvelope> {
  const { start, end } = (() => {
    const s = new Date();
    s.setHours(0, 0, 0, 0);
    const e = new Date();
    e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
  })();

  const [plans, shifts, activeStaff] = await Promise.all([
    prisma.shiftPlan.findMany({ where: { tenantId: options.tenantId }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.staffShift.findMany({
      where: { tenantId: options.tenantId, clockInAt: { gte: start, lte: end } },
      include: { staffMember: { select: { name: true, role: true } } },
    }),
    prisma.staffMember.count({ where: { tenantId: options.tenantId, status: "attivo" } }),
  ]);

  const ruleRecommendation = {
    scheduledPlans: plans,
    clockedInToday: shifts.map((s) => ({
      name: s.staffMember.name,
      role: s.staffMember.role,
      clockInAt: s.clockInAt.toISOString(),
    })),
    activeStaffCount: activeStaff,
    suggestedCoverage: {
      sala: Math.ceil(options.supplemental.bookingsNext7Days.totalCovers / 7 / 20),
      cucina: Math.ceil(options.supplemental.recentOrderVelocity.ordersToday / 15),
    },
  };

  const summary = `${shifts.length} timbrature oggi, ${plans.length} turni pianificati, ${activeStaff} attivi`;

  return wrapDecision(
    "staff_shifts",
    summary,
    ruleRecommendation,
    ["shift_plans", "staff_shifts", "bookings_covers", "order_velocity"],
    options,
  );
}

export async function engineHotelOccupancy(options: EngineOptions): Promise<AiDecisionEnvelope> {
  const today = new Date();
  const from = new Date(today);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);

  const [rooms, reservations, unified] = await Promise.all([
    prisma.hotelRoom.groupBy({ by: ["status"], where: { tenantId: options.tenantId }, _count: true }),
    prisma.hotelReservation.findMany({
      where: {
        tenantId: options.tenantId,
        checkInDate: { lte: to },
        checkOutDate: { gt: from },
        status: { in: ["confermata", "in_casa"] },
      },
      select: { checkInDate: true, checkOutDate: true, guests: true, status: true },
    }),
    unifiedReportsRepository.snapshot(options.tenantId, {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    }),
  ]);

  const totalRooms = rooms.reduce((s, r) => s + r._count, 0);
  const occupied = rooms.find((r) => r.status === "occupata")?._count ?? 0;
  const occupancyPct = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

  const ruleRecommendation = {
    currentOccupancyPct: occupancyPct,
    totalRooms,
    reservationsNext7d: reservations.length,
    arrivalsTomorrow: options.supplemental.hotelTomorrow.arrivals,
    unifiedSnapshot: unified,
    ruleForecast: {
      note: "Rule-based: occupazione corrente + prenotazioni confermate nel range",
      occupancyPct,
    },
  };

  return wrapDecision(
    "hotel_occupancy",
    `Occupazione ${occupancyPct}%, ${reservations.length} prenotazioni prossimi 7 giorni`,
    ruleRecommendation,
    ["room_status", "reservations", "unified_reports", "sales_trend_forecast", "season"],
    options,
  );
}

export async function engineCantinaPromo(options: EngineOptions): Promise<AiDecisionEnvelope> {
  const cantina = await aiCantinaRepository.snapshot(options.tenantId);
  const promos = [
    ...cantina.salesRecommendations.slice(0, 5),
    ...cantina.pricingSuggestions.slice(0, 3).map((p) => ({
      id: p.id,
      name: p.name,
      producer: "",
      reason: p.reason,
      priority: "medium" as const,
    })),
  ];

  const summary =
    promos.length > 0
      ? promos.slice(0, 4).map((p) => `${p.name}: ${p.reason}`).join("; ")
      : "Nessuna promozione cantina rule-based";

  return wrapDecision(
    "cantina_promo",
    summary,
    { recommendations: promos, kpi: cantina.kpi, lowStock: cantina.lowStockAlerts },
    ["wine_stock", "margin_analysis", "vintage_alerts", "sales_trend"],
    options,
  );
}

export async function engineCrmVip(options: EngineOptions): Promise<AiDecisionEnvelope> {
  const customers = await customersRepository.all(options.tenantId);

  const ruleCandidates = customers
    .filter((c) => c.type !== "vip")
    .slice()
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 15)
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      visits: c.visits,
      totalSpent: c.totalSpent,
      avgSpend: c.avgSpend,
      ruleScore: c.visits >= 5 && c.totalSpent >= 500 ? "habitue_candidate" : c.totalSpent >= 1000 ? "vip_candidate" : "none",
    }));

  const existingVip = customers.filter((c) => c.type === "vip").length;
  const summary = `${existingVip} VIP attuali, ${ruleCandidates.filter((c) => c.ruleScore !== "none").length} candidati rule-based`;

  return wrapDecision(
    "crm_vip",
    summary,
    { existingVipCount: existingVip, candidates: ruleCandidates },
    ["customer_spend", "visit_count", "manual_segmentation", "bookings_allergies"],
    options,
  );
}

export async function engineSupervisorAnomaly(options: EngineOptions): Promise<AiDecisionEnvelope> {
  const [snapshot, storni, unified] = await Promise.all([
    aiKitchenRepository.operationalSnapshot(options.tenantId, options.periodDays),
    supervisorStorniRepository.list(options.tenantId),
    unifiedReportsRepository.snapshot(options.tenantId),
  ]);

  const alerts = {
    lossDishes: snapshot.kpi.lossDishes,
    lowMarginDishes: snapshot.kpi.lowMarginDishes,
    expiringLots: snapshot.kpi.expiringLots,
    stagnantProducts: snapshot.kpi.stagnantProducts,
    dailyLossEstimate: snapshot.managerReport.dailyLossEstimate,
    recentStorni: storni.slice(0, 10),
    marginPct: unified.realCosts.margin,
    revenueDelta: options.supplemental.salesTrend.deltaRevenuePct,
  };

  const anomalyCount =
    alerts.lossDishes +
    alerts.expiringLots +
    (alerts.recentStorni.length > 0 ? 1 : 0) +
    (alerts.dailyLossEstimate > 0 ? 1 : 0);

  const summary =
    anomalyCount > 0
      ? `${anomalyCount} aree anomale: ${alerts.lossDishes} piatti in perdita, ${alerts.recentStorni.length} storni recenti`
      : "Nessuna anomalia rule-based rilevata";

  return wrapDecision(
    "supervisor_anomaly",
    summary,
    alerts,
    ["food_cost_kpi", "warehouse_kpi", "storni", "unified_margin", "revenue_delta"],
    options,
  );
}

const ENGINE_MAP: Record<
  AiDecisionDomain,
  (options: EngineOptions) => Promise<AiDecisionEnvelope>
> = {
  reorder: engineReorder,
  inventory_depletion: engineInventoryDepletion,
  food_cost: engineFoodCost,
  pricing: enginePricing,
  staff_shifts: engineStaffShifts,
  hotel_occupancy: engineHotelOccupancy,
  cantina_promo: engineCantinaPromo,
  crm_vip: engineCrmVip,
  supervisor_anomaly: engineSupervisorAnomaly,
};

export async function runDomainEngine(
  domain: AiDecisionDomain,
  options: EngineOptions,
): Promise<AiDecisionEnvelope> {
  return ENGINE_MAP[domain](options);
}

export { ENGINE_MAP };
