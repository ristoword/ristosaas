"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  aiCommandCenterApi,
  aiOpsApi,
  reportsApi,
  type CantinaAiSnapshot,
  type CommandCenterDashboard,
  type KitchenOperationalSnapshot,
  type ReportTrendsSnapshot,
} from "@/lib/api-client";
import { resolveAiModule } from "@/lib/ai/ui/nav-module-map";

export type ModuleAiInsight = {
  navId: string;
  aiModule: string;
  aiOnline: boolean;
  activeWorkflows: number;
  automationsCount: number;
  automationLevel: number | null;
  decisionsToday: number;
  lastIntervention: string | null;
  lastUpdate: string | null;
  alerts: number;
  suggestions: number;
  pendingApprovals: number;
  avgResponseMs: number;
  extras: Array<{ label: string; value: string }>;
};

function filterByModule<T extends { module?: string }>(items: T[], aiModule: string): T[] {
  return items.filter((i) => !i.module || i.module === aiModule || i.module.includes(aiModule));
}

function buildExtras(
  navId: string,
  kitchen: KitchenOperationalSnapshot | null,
  cantina: CantinaAiSnapshot | null,
  trends: ReportTrendsSnapshot | null,
): Array<{ label: string; value: string }> {
  switch (navId) {
    case "cucina":
    case "pizzeria":
      return [
        { label: "Prep suggerite", value: String(kitchen?.menuGenerator.dailyMenu.length ?? 0) },
        { label: "Piatti consigliati", value: String(kitchen?.menuGenerator.seasonalMenu.length ?? 0) },
        { label: "Margini critici", value: String(kitchen?.kpi.lowMarginDishes ?? 0) },
        { label: "Food Cost AI", value: `${kitchen?.managerReport.averageMarginPct?.toFixed?.(0) ?? "—"}%` },
        { label: "Scarti stimati", value: `€${kitchen?.managerReport.estimatedWasteValue?.toFixed?.(0) ?? "0"}` },
        { label: "Carico cucina", value: String(kitchen?.managerReport.topDishes.length ?? 0) },
      ];
    case "magazzino":
      return [
        { label: "Riordini suggeriti", value: String(kitchen?.reorder.length ?? 0) },
        { label: "Scadenze", value: String(kitchen?.kpi.expiringLots ?? 0) },
        { label: "Sprechi", value: `€${kitchen?.managerReport.estimatedWasteValue?.toFixed?.(0) ?? "0"}` },
        { label: "Prodotti fermi", value: String(kitchen?.kpi.stagnantProducts ?? 0) },
        { label: "FIFO alert", value: String(kitchen?.warehouse.expiringProducts.length ?? 0) },
        { label: "Valore stock", value: String(kitchen?.reorder.reduce((a, r) => a + r.suggestedOrderQty, 0) ?? 0) },
      ];
    case "cassa":
      return [
        { label: "Incasso oggi", value: `€${trends?.day.revenue?.toFixed?.(0) ?? "0"}` },
        { label: "Trend sett.", value: `${trends?.week.deltaRevenuePct?.toFixed?.(1) ?? "—"}%` },
        { label: "Margine", value: `€${trends?.day.margin?.toFixed?.(0) ?? "0"}` },
        { label: "Forecast 7g", value: `€${trends?.forecast.next7.projectedRevenue?.toFixed?.(0) ?? "0"}` },
        { label: "Performance", value: trends?.forecast.next7.confidence ?? "—" },
        { label: "Anomalie", value: String(kitchen?.kpi.lossDishes ?? 0) },
      ];
    case "rooms":
      return [
        { label: "Coperti previsti", value: String(kitchen?.hotelBridge.breakfastCoversTomorrow ?? 0) },
        { label: "Mezza pensione", value: String(kitchen?.hotelBridge.halfBoardGuestsTomorrow ?? 0) },
        { label: "Pensione compl.", value: String(kitchen?.hotelBridge.fullBoardGuestsTomorrow ?? 0) },
        { label: "Note servizio", value: String(kitchen?.hotelBridge.notes.length ?? 0) },
      ];
    case "hotel":
    case "hotel-rooms":
    case "hotel-reservations":
      return [
        { label: "Occupazione", value: String(kitchen?.hotelBridge.breakfastCoversTomorrow ?? 0) },
        { label: "Forecast", value: trends?.forecast.next7.confidence ?? "—" },
        { label: "Revenue prev.", value: `€${trends?.forecast.next7.projectedRevenue?.toFixed?.(0) ?? "0"}` },
        { label: "Check-in domani", value: String(kitchen?.hotelBridge.breakfastCoversTomorrow ?? 0) },
      ];
    case "cantina":
    case "bar":
      return [
        { label: "Etichette", value: String(cantina?.kpi.totalLabels ?? 0) },
        { label: "Giacenza", value: String(cantina?.kpi.totalStock ?? 0) },
        { label: "Margini", value: `${cantina?.kpi.avgMarginPct?.toFixed?.(0) ?? "—"}%` },
        { label: "Riordini", value: String(cantina?.kpi.lowStockCount ?? 0) },
        { label: "Esauriti", value: String(cantina?.kpi.outOfStockCount ?? 0) },
        { label: "Valore stock", value: `€${cantina?.kpi.totalStockValue?.toFixed?.(0) ?? "0"}` },
      ];
    case "pizzeria":
      return [
        { label: "Impasti", value: String(kitchen?.menuGenerator.dailyMenu.length ?? 0) },
        { label: "Produzione", value: String(kitchen?.managerReport.topDishes.length ?? 0) },
        { label: "Priorità", value: String(kitchen?.kpi.lossDishes ?? 0) },
        { label: "Tempi forno", value: "AI" },
      ];
    case "supervisor":
      return [
        { label: "KPI margini", value: `${kitchen?.managerReport.averageMarginPct?.toFixed?.(0) ?? "—"}%` },
        { label: "Perdite stimate", value: `€${kitchen?.managerReport.dailyLossEstimate?.toFixed?.(0) ?? "0"}` },
        { label: "Top piatti", value: String(kitchen?.managerReport.topDishes.length ?? 0) },
        { label: "Audit alert", value: String(kitchen?.kpi.lowMarginDishes ?? 0) },
      ];
    default:
      return [];
  }
}

function buildInsight(
  navId: string,
  dashboard: CommandCenterDashboard | null,
  kitchen: KitchenOperationalSnapshot | null,
  cantina: CantinaAiSnapshot | null,
  trends: ReportTrendsSnapshot | null,
  pendingByModule: Map<string, number>,
): ModuleAiInsight {
  const aiModule = resolveAiModule(navId);
  const automations = dashboard?.automations.filter((a) => a.module === aiModule) ?? [];
  const decisions = filterByModule(dashboard?.decisions ?? [], aiModule);
  const timeline = filterByModule(dashboard?.timeline ?? [], aiModule);
  const workflows = filterByModule(dashboard?.workflowsLive ?? [], aiModule);
  const alerts = timeline.filter((t) => t.level === "warning" || t.level === "error").length;

  return {
    navId,
    aiModule,
    aiOnline: dashboard?.status.online ?? false,
    activeWorkflows: workflows.length,
    automationsCount: automations.filter((a) => a.enabled).length,
    automationLevel: automations[0]?.level ?? null,
    decisionsToday: decisions.length,
    lastIntervention: timeline[0]?.message ?? decisions[0]?.decision ?? null,
    lastUpdate: dashboard?.generatedAt ?? kitchen?.generatedAt ?? cantina?.generatedAt ?? null,
    alerts,
    suggestions: decisions.filter((d) => d.confidence != null && d.confidence < 0.7).length,
    pendingApprovals: pendingByModule.get(aiModule) ?? 0,
    avgResponseMs: dashboard?.kpis.avgResponseMs ?? 0,
    extras: buildExtras(navId, kitchen, cantina, trends),
  };
}

export function useDashboardModuleAi(navIds: string[]) {
  const [dashboard, setDashboard] = useState<CommandCenterDashboard | null>(null);
  const [kitchen, setKitchen] = useState<KitchenOperationalSnapshot | null>(null);
  const [cantina, setCantina] = useState<CantinaAiSnapshot | null>(null);
  const [trends, setTrends] = useState<ReportTrendsSnapshot | null>(null);
  const [pendingByModule, setPendingByModule] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [cc, k, c, t, props] = await Promise.all([
        aiCommandCenterApi.dashboard({ periodDays: 7 }).catch(() => null),
        aiOpsApi.kitchenOperationalInsights(14).catch(() => null),
        aiOpsApi.cantinaInsights().catch(() => null),
        reportsApi.trends().catch(() => null),
        aiOpsApi.proposals.list({ open: true, limit: 50 }).catch(() => ({ proposals: [] })),
      ]);
      setDashboard(cc);
      setKitchen(k);
      setCantina(c);
      setTrends(t);
      const map = new Map<string, number>();
      for (const p of props.proposals) {
        map.set(p.type, (map.get(p.type) ?? 0) + 1);
      }
      setPendingByModule(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const insights = useMemo(() => {
    const out = new Map<string, ModuleAiInsight>();
    for (const id of navIds) {
      out.set(id, buildInsight(id, dashboard, kitchen, cantina, trends, pendingByModule));
    }
    return out;
  }, [navIds, dashboard, kitchen, cantina, trends, pendingByModule]);

  return { insights, loading, refresh, dashboard };
}
