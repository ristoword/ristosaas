import { aiKitchenRepository } from "@/lib/db/repositories/ai-kitchen.repository";
import { haccpRepository } from "@/lib/db/repositories/haccp.repository";
import { hardwareRepository } from "@/lib/db/repositories/hardware.repository";
import { prisma } from "@/lib/db/prisma";
import type { AutomationConfig } from "@/lib/ai/automation/types";
import {
  AUTOMATION_TRIGGERS,
  DEFAULT_TRIGGER_THRESHOLDS,
  TRIGGER_TO_MODULE,
  type AutomationTriggerType,
  type TriggerEvaluation,
} from "@/lib/ai/automation/types";
import { automationConfigStore } from "@/lib/ai/automation/config-store";

function threshold(configs: AutomationConfig[], module: string, key: string, fallback: number): number {
  const cfg = configs.find((c) => c.module === module && !c.role);
  const val = Number(cfg?.conditions?.[key]);
  return Number.isFinite(val) ? val : fallback;
}

async function evaluateLowStock(tenantId: string, configs: AutomationConfig[]): Promise<TriggerEvaluation> {
  const snapshot = await aiKitchenRepository.operationalSnapshot(tenantId, 14);
  const low = snapshot.reorder.filter((r) => r.qty <= r.minStock * threshold(configs, "magazzino", "lowStockRatio", DEFAULT_TRIGGER_THRESHOLDS.lowStockRatio));
  return {
    trigger: "prodotto_sotto_scorta",
    module: "magazzino",
    fired: low.length > 0,
    severity: low.length >= 3 ? "critical" : "warning",
    summary: low.length ? `${low.length} prodotti sotto scorta` : "Scorte nella norma",
    context: { items: low.slice(0, 10) },
    dataUsed: ["warehouse_stock", "minStock", "reorder_rules"],
  };
}

async function evaluateExpiring(tenantId: string, configs: AutomationConfig[]): Promise<TriggerEvaluation> {
  const snapshot = await aiKitchenRepository.operationalSnapshot(tenantId, 14);
  const days = threshold(configs, "magazzino", "expiringDays", DEFAULT_TRIGGER_THRESHOLDS.expiringDays);
  const expiring = snapshot.warehouse.expiringProducts.filter((p) => p.daysToExpire <= days);
  return {
    trigger: "prodotto_in_scadenza",
    module: "magazzino",
    fired: expiring.length > 0,
    severity: expiring.some((p) => p.daysToExpire <= 2) ? "critical" : "warning",
    summary: expiring.length ? `${expiring.length} lotti in scadenza entro ${days}g` : "Nessuna scadenza imminente",
    context: { products: expiring.slice(0, 10), expiringDays: days },
    dataUsed: ["warehouse_lots", "expiry_dates"],
  };
}

async function evaluateFoodCost(tenantId: string, configs: AutomationConfig[]): Promise<TriggerEvaluation> {
  const snapshot = await aiKitchenRepository.operationalSnapshot(tenantId, 14);
  const target = threshold(configs, "food_cost", "foodCostPct", DEFAULT_TRIGGER_THRESHOLDS.foodCostPct);
  const critical = snapshot.foodCost.filter((d) => d.actualFoodCostPct > target || d.status !== "healthy");
  return {
    trigger: "food_cost_sopra_target",
    module: "food_cost",
    fired: critical.length > 0,
    severity: critical.some((d) => d.status === "loss") ? "critical" : "warning",
    summary: critical.length ? `${critical.length} piatti sopra target food cost ${target}%` : "Food cost OK",
    context: { dishes: critical.slice(0, 8), targetPct: target },
    dataUsed: ["food_cost_snapshot", "recipe_costs"],
  };
}

async function evaluateMargin(tenantId: string, configs: AutomationConfig[]): Promise<TriggerEvaluation> {
  const snapshot = await aiKitchenRepository.operationalSnapshot(tenantId, 14);
  const minMargin = threshold(configs, "food_cost", "marginPct", DEFAULT_TRIGGER_THRESHOLDS.marginPct);
  const low = snapshot.foodCost.filter((d) => d.marginPct < minMargin);
  return {
    trigger: "margine_sotto_soglia",
    module: "food_cost",
    fired: low.length > 0,
    severity: "warning",
    summary: low.length ? `${low.length} piatti con margine < ${minMargin}%` : "Margini OK",
    context: { dishes: low.slice(0, 8), minMarginPct: minMargin },
    dataUsed: ["margin_analysis", "menu_prices"],
  };
}

async function evaluateBeverageCost(tenantId: string, configs: AutomationConfig[]): Promise<TriggerEvaluation> {
  const snapshot = await aiKitchenRepository.operationalSnapshot(tenantId, 14);
  const target = threshold(configs, "cantina", "beverageCostPct", DEFAULT_TRIGGER_THRESHOLDS.beverageCostPct);
  const barItems = snapshot.foodCost.filter((d) => /vino|drink|cocktail|birra|bevanda/i.test(d.menuItem));
  const critical = barItems.filter((d) => d.actualFoodCostPct > target);
  return {
    trigger: "beverage_cost_sopra_target",
    module: "cantina",
    fired: critical.length > 0,
    severity: "warning",
    summary: critical.length ? `Beverage cost elevato su ${critical.length} voci` : "Beverage cost OK",
    context: { items: critical.slice(0, 6), targetPct: target },
    dataUsed: ["cantina_costs", "wine_cellar"],
  };
}

async function evaluateBookings(tenantId: string, configs: AutomationConfig[]): Promise<TriggerEvaluation> {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const count = await prisma.booking.count({
    where: { tenantId, createdAt: { gte: since } },
  });
  const surge = threshold(configs, "prenotazioni", "bookingSurgePct", DEFAULT_TRIGGER_THRESHOLDS.bookingSurgePct);
  const baseline = 20;
  const pct = baseline > 0 ? (count / baseline) * 100 : 0;
  return {
    trigger: "prenotazioni_elevate",
    module: "prenotazioni",
    fired: pct >= surge,
    severity: pct >= surge * 1.2 ? "critical" : "warning",
    summary: pct >= surge ? `Prenotazioni +${Math.round(pct - 100)}% vs baseline` : "Prenotazioni nella norma",
    context: { count7d: count, surgePct: pct, threshold: surge },
    dataUsed: ["bookings_7d"],
  };
}

async function evaluateHotelOccupancy(tenantId: string, configs: AutomationConfig[]): Promise<TriggerEvaluation> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const start = new Date(tomorrow.toISOString().slice(0, 10));
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [rooms, reservations] = await Promise.all([
    prisma.hotelRoom.count({ where: { tenantId, status: { not: "fuori_servizio" } } }),
    prisma.hotelReservation.count({
      where: {
        tenantId,
        checkInDate: { lt: end },
        checkOutDate: { gt: start },
        status: { in: ["confermata", "in_casa"] },
      },
    }),
  ]);

  const occupancy = rooms > 0 ? (reservations / rooms) * 100 : 0;
  const target = threshold(configs, "hotel", "hotelOccupancyPct", DEFAULT_TRIGGER_THRESHOLDS.hotelOccupancyPct);

  return {
    trigger: "occupazione_hotel_elevata",
    module: "hotel",
    fired: occupancy >= target,
    severity: occupancy >= 95 ? "critical" : "warning",
    summary: occupancy >= target ? `Occupazione domani ${Math.round(occupancy)}%` : "Occupazione hotel OK",
    context: { occupancyPct: occupancy, rooms, reservations, threshold: target },
    dataUsed: ["hotel_rooms", "hotel_reservations"],
  };
}

async function evaluateHaccp(tenantId: string): Promise<TriggerEvaluation[]> {
  const entries = await haccpRepository.list(tenantId, { limit: 50 });
  const nonConforme = entries.filter((e) => e.conforme === false);
  const tempOut = entries.filter(
    (e) =>
      e.tempC != null &&
      ((e.thresholdMin != null && e.tempC < e.thresholdMin) ||
        (e.thresholdMax != null && e.tempC > e.thresholdMax)),
  );

  return [
    {
      trigger: "haccp_non_conforme",
      module: "haccp",
      fired: nonConforme.length > 0,
      severity: "critical",
      summary: nonConforme.length ? `${nonConforme.length} registrazioni HACCP non conformi` : "HACCP conforme",
      context: { entries: nonConforme.slice(0, 5) },
      dataUsed: ["haccp_entries"],
    },
    {
      trigger: "temperatura_fuori_limite",
      module: "haccp",
      fired: tempOut.length > 0,
      severity: "critical",
      summary: tempOut.length ? `${tempOut.length} temperature fuori soglia` : "Temperature OK",
      context: { entries: tempOut.slice(0, 5) },
      dataUsed: ["haccp_temperature"],
    },
  ];
}

async function evaluateHousekeeping(tenantId: string): Promise<TriggerEvaluation[]> {
  const now = new Date();
  const tasks = await prisma.housekeepingTask.findMany({
    where: { tenantId },
    orderBy: { scheduledFor: "desc" },
    take: 100,
  });
  const ready = tasks.filter((t) => t.status === "done");
  const late = tasks.filter((t) => t.status === "todo" && t.scheduledFor < now);

  return [
    {
      trigger: "camera_pronta",
      module: "housekeeping",
      fired: ready.length > 0,
      severity: "info",
      summary: ready.length ? `${ready.length} camere pronte` : "Nessuna camera pronta recente",
      context: { count: ready.length },
      dataUsed: ["housekeeping_tasks"],
    },
    {
      trigger: "camera_in_ritardo",
      module: "housekeeping",
      fired: late.length > 0,
      severity: "warning",
      summary: late.length ? `${late.length} camere in ritardo` : "Housekeeping in orario",
      context: { count: late.length },
      dataUsed: ["housekeeping_tasks"],
    },
  ];
}

async function evaluateLicense(tenantId: string, configs: AutomationConfig[]): Promise<TriggerEvaluation> {
  const days = threshold(configs, "licenze", "licenseExpiryDays", DEFAULT_TRIGGER_THRESHOLDS.licenseExpiryDays);
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + days);
  const license = await prisma.tenantLicense.findFirst({
    where: { tenantId, expiresAt: { lte: deadline } },
    orderBy: { expiresAt: "asc" },
  });

  return {
    trigger: "licenza_saas_in_scadenza",
    module: "licenze",
    fired: Boolean(license),
    severity: license && license.expiresAt < new Date() ? "critical" : "warning",
    summary: license
      ? `Licenza in scadenza ${license.expiresAt.toISOString().slice(0, 10)}`
      : "Licenza SaaS OK",
    context: license
      ? { licenseId: license.id, expiresAt: license.expiresAt.toISOString(), plan: license.plan }
      : {},
    dataUsed: ["tenant_license"],
  };
}

async function evaluateHardware(tenantId: string): Promise<TriggerEvaluation> {
  const devices = await hardwareRepository.listDevices(tenantId);
  const maintenance = devices.filter((d) => d.status === "manutenzione" || d.status === "offline");
  return {
    trigger: "manutenzione_hardware",
    module: "hardware",
    fired: maintenance.length > 0,
    severity: maintenance.some((d) => d.status === "offline") ? "critical" : "warning",
    summary: maintenance.length ? `${maintenance.length} dispositivi richiedono attenzione` : "Hardware OK",
    context: { devices: maintenance.slice(0, 8) },
    dataUsed: ["hardware_devices"],
  };
}

async function evaluatePayments(tenantId: string, configs: AutomationConfig[]): Promise<TriggerEvaluation> {
  const days = threshold(configs, "cassa", "paymentDueDays", DEFAULT_TRIGGER_THRESHOLDS.paymentDueDays);
  const openFolios = await prisma.guestFolio.count({
    where: { tenantId, balance: { gt: 0 }, status: "open" },
  });
  return {
    trigger: "pagamento_in_scadenza",
    module: "cassa",
    fired: openFolios > 0,
    severity: "warning",
    summary: openFolios ? `${openFolios} folio con saldo aperto` : "Pagamenti OK",
    context: { openFolios, dueDays: days },
    dataUsed: ["guest_folios"],
  };
}

async function evaluateCalendarEvents(tenantId: string): Promise<TriggerEvaluation> {
  const now = new Date();
  const week = new Date(now);
  week.setDate(week.getDate() + 7);
  const events = await prisma.cateringEvent.count({
    where: { tenantId, date: { gte: now, lte: week } },
  });
  return {
    trigger: "evento_calendario",
    module: "catering",
    fired: events > 0,
    severity: "info",
    summary: events ? `${events} eventi catering prossimi 7g` : "Nessun evento imminente",
    context: { events7d: events },
    dataUsed: ["catering_events"],
  };
}

async function evaluateWeather(configs: AutomationConfig[]): Promise<TriggerEvaluation> {
  const severity = threshold(configs, "dashboard", "weatherSeverity", DEFAULT_TRIGGER_THRESHOLDS.weatherSeverity);
  const configured = configs.find((c) => c.module === "dashboard")?.conditions?.weatherAlert;
  const active = Boolean(configured) || process.env.AI_AUTOMATION_WEATHER_ALERT === "true";
  return {
    trigger: "previsione_meteo_critica",
    module: "dashboard",
    fired: active,
    severity: "warning",
    summary: active ? "Previsione meteo critica configurata" : "Meteo non critico",
    context: { severityThreshold: severity, configured: configured ?? null },
    dataUsed: ["weather_config"],
  };
}

async function evaluateStaff(tenantId: string): Promise<TriggerEvaluation[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const shifts = await prisma.staffShift.count({
    where: { tenantId, clockInAt: { gte: today, lt: tomorrow } },
  });
  const bookings = await prisma.booking.count({
    where: { tenantId, date: { gte: today, lt: tomorrow } },
  });

  const needed = Math.max(2, Math.ceil(bookings / 15));
  const insufficient = shifts < needed;
  const overstaffed = shifts > needed * 2;

  return [
    {
      trigger: "personale_insufficiente",
      module: "staff",
      fired: insufficient,
      severity: "warning",
      summary: insufficient ? `Turni insufficienti: ${shifts}/${needed}` : "Copertura staff OK",
      context: { shifts, needed, bookings },
      dataUsed: ["staff_shifts", "bookings_today"],
    },
    {
      trigger: "overstaffing",
      module: "staff",
      fired: overstaffed,
      severity: "info",
      summary: overstaffed ? `Possibile overstaffing: ${shifts} turni vs ${needed} richiesti` : "Staffing equilibrato",
      context: { shifts, needed },
      dataUsed: ["staff_shifts"],
    },
  ];
}

const EVALUATORS: Record<
  AutomationTriggerType,
  (tenantId: string, configs: AutomationConfig[]) => Promise<TriggerEvaluation | TriggerEvaluation[]>
> = {
  prodotto_sotto_scorta: evaluateLowStock,
  prodotto_in_scadenza: evaluateExpiring,
  food_cost_sopra_target: evaluateFoodCost,
  beverage_cost_sopra_target: evaluateBeverageCost,
  margine_sotto_soglia: evaluateMargin,
  personale_insufficiente: (t, c) => evaluateStaff(t).then((r) => r[0]),
  overstaffing: (t) => evaluateStaff(t).then((r) => r[1]),
  prenotazioni_elevate: evaluateBookings,
  occupazione_hotel_elevata: evaluateHotelOccupancy,
  haccp_non_conforme: (t) => evaluateHaccp(t).then((r) => r[0]),
  temperatura_fuori_limite: (t) => evaluateHaccp(t).then((r) => r[1]),
  camera_pronta: (t) => evaluateHousekeeping(t).then((r) => r[0]),
  camera_in_ritardo: (t) => evaluateHousekeeping(t).then((r) => r[1]),
  pagamento_in_scadenza: evaluatePayments,
  licenza_saas_in_scadenza: evaluateLicense,
  manutenzione_hardware: evaluateHardware,
  evento_calendario: evaluateCalendarEvents,
  previsione_meteo_critica: (_, c) => evaluateWeather(c),
};

export async function evaluateTriggers(
  tenantId: string,
  options?: { triggerFilter?: AutomationTriggerType[]; configs?: AutomationConfig[] },
): Promise<TriggerEvaluation[]> {
  const configs = options?.configs ?? (await automationConfigStore.list(tenantId));
  const triggers = options?.triggerFilter ?? [...AUTOMATION_TRIGGERS];
  const results: TriggerEvaluation[] = [];

  for (const trigger of triggers) {
    if (!automationConfigStore.isTriggerEnabled(configs, trigger)) continue;
    const evaluator = EVALUATORS[trigger];
    if (!evaluator) continue;
    try {
      const out = await evaluator(tenantId, configs);
      const list = Array.isArray(out) ? out : [out];
      for (const ev of list) {
        if (ev.module !== TRIGGER_TO_MODULE[trigger]) {
          results.push({ ...ev, trigger });
        } else {
          results.push(ev);
        }
      }
    } catch {
      results.push({
        trigger,
        module: TRIGGER_TO_MODULE[trigger],
        fired: false,
        severity: "info",
        summary: `Valutazione trigger ${trigger} non disponibile`,
        context: {},
        dataUsed: [],
      });
    }
  }

  return results;
}

export function getFiredTriggers(evaluations: TriggerEvaluation[]): TriggerEvaluation[] {
  return evaluations.filter((e) => e.fired);
}
