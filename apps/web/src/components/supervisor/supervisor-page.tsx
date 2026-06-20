"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeEuro,
  BarChart3,
  BedDouble,
  Box,
  ChefHat,
  ClipboardList,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wine,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { Card } from "@/components/shared/card";
import { TabBar } from "@/components/shared/tab-bar";
import { DataTable } from "@/components/shared/data-table";
import { AiChat, AiToggleButton } from "@/components/ai/ai-chat";
import {
  ordersApi,
  menuApi,
  cantinaApi,
  warehouseApi,
  staffApi,
  archivioApi,
  integrationApi,
  hotelApi,
  reportsApi,
  aiOpsApi,
  supervisorStorniApi,
  type Order,
  type MenuItem as ApiMenuItem,
  type WineCellarItem,
  type FolioCharge,
  type GuestFolio,
  type HotelReservation,
  type HotelRoom,
  type StockItem,
  type StaffMember,
  type ArchivedOrder,
  type UnifiedReportSnapshot,
  type ReportTrendsSnapshot,
  type StaffShift,
  type WarehouseAlert,
  type AiProposal,
  type KitchenOperationalSnapshot,
  type SupervisorStornoDto,
} from "@/lib/api-client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Storno = {
  id: string;
  dataOra: string;
  importo: number;
  motivo: string;
  tavolo: string;
  ordineId: string;
  note: string;
};

function mapDtoToStorno(row: SupervisorStornoDto): Storno {
  return {
    id: row.id,
    dataOra: row.createdAt.replace("T", " ").slice(0, 16),
    importo: row.amount,
    motivo: row.motivo,
    tavolo: row.tavolo,
    ordineId: row.ordineId,
    note: row.note,
  };
}

// TABS defined inside component to use t()

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MetricCard({ label, value, sub, icon: Icon, trend }: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof DollarSign;
  trend?: "up" | "down" | "neutral";
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-rw-line bg-rw-surface p-4">
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surfaceAlt text-rw-accent ring-1 ring-rw-line">
          <Icon className="h-5 w-5" />
        </span>
        {trend === "up" && <ArrowUpRight className="h-4 w-4 text-emerald-400" />}
        {trend === "down" && <ArrowDownRight className="h-4 w-4 text-red-400" />}
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-rw-ink">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-rw-muted">{label}</p>
      {sub && <p className="mt-1 text-[11px] text-rw-soft">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function SupervisorPage() {
  const { t } = useI18n();
  const TABS = [
    { id: "report", label: t("supervisor.tab.report") },
    { id: "storico", label: t("supervisor.tab.history") },
    { id: "storni", label: t("supervisor.tab.storni") },
    { id: "menu", label: t("supervisor.tab.menu") },
    { id: "cantina", label: t("supervisor.tab.cantina") },
    { id: "magazzino", label: t("supervisor.tab.warehouse") },
    { id: "unified", label: t("supervisor.tab.unified") },
  ];
  const [tab, setTab] = useState("report");
  const [aiOpen, setAiOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
  const [warehouseAlerts, setWarehouseAlerts] = useState<WarehouseAlert[]>([]);
  const [totalStockValue, setTotalStockValue] = useState(0);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [staffShifts, setStaffShifts] = useState<StaffShift[]>([]);
  const [archivedOrders, setArchivedOrders] = useState<ArchivedOrder[]>([]);
  const [hotelRooms, setHotelRooms] = useState<HotelRoom[]>([]);
  const [hotelReservations, setHotelReservations] = useState<HotelReservation[]>([]);
  const [folios, setFolios] = useState<GuestFolio[]>([]);
  const [folioCharges, setFolioCharges] = useState<FolioCharge[]>([]);
  const [unifiedReport, setUnifiedReport] = useState<UnifiedReportSnapshot | null>(null);
  const [trends, setTrends] = useState<ReportTrendsSnapshot | null>(null);
  const [aiProposals, setAiProposals] = useState<AiProposal[]>([]);
  const [aiSnapshot, setAiSnapshot] = useState<KitchenOperationalSnapshot | null>(null);
  const [wineItems, setWineItems] = useState<WineCellarItem[]>([]);
  const [unifiedFrom, setUnifiedFrom] = useState("");
  const [unifiedTo, setUnifiedTo] = useState("");

  const [storicoFilter, setStoricoFilter] = useState("");
  const [menuFilter, setMenuFilter] = useState("");
  const [menuCatFilter, setMenuCatFilter] = useState("tutti");
  const [storni, setStorni] = useState<Storno[]>([]);

  const [sImporto, setSImporto] = useState("");
  const [sMotivo, setSMotivo] = useState("");
  const [sTavolo, setSTavolo] = useState("");
  const [sOrdineId, setSOrdineId] = useState("");
  const [sNote, setSNote] = useState("");
  const [stornoSaveError, setStornoSaveError] = useState<string | null>(null);
  const [stornoSaving, setStornoSaving] = useState(false);

  useEffect(() => {
    supervisorStorniApi
      .list()
      .then((rows) => setStorni(rows.map(mapDtoToStorno)))
      .catch((err) => console.error("Failed to load supervisor storni:", err));
  }, []);

  useEffect(() => {
    Promise.all([
      ordersApi.list(),
      menuApi.listItems(),
      warehouseApi.list(),
      staffApi.list(),
      staffApi.listShifts(),
      archivioApi.list(),
      hotelApi.listRooms(),
      hotelApi.listReservations(),
      integrationApi.listFolios(),
      integrationApi.listCharges(),
      reportsApi.unified(),
      reportsApi.trends(),
      aiOpsApi.proposals.list({ open: true, limit: 20 }),
      aiOpsApi.kitchenOperationalInsights(14),
      cantinaApi.list().catch(() => [] as WineCellarItem[]),
    ])
      .then(([ordersData, menuData, warehouseData, staffData, shiftsData, archivioData, roomsData, reservationsData, foliosData, chargesData, unifiedData, trendsData, proposalsData, snapshotData, wineData]) => {
        setOrders(ordersData);
        setMenuItems(menuData);
        setStockItems(warehouseData.items);
        setLowStockItems(warehouseData.lowStock);
        setWarehouseAlerts(warehouseData.alerts);
        setTotalStockValue(warehouseData.totalValue);
        setStaffMembers(staffData);
        setStaffShifts(shiftsData);
        setArchivedOrders(archivioData);
        setHotelRooms(roomsData);
        setHotelReservations(reservationsData);
        setFolios(foliosData);
        setFolioCharges(chargesData);
        setUnifiedReport(unifiedData);
        setTrends(trendsData);
        setAiProposals(proposalsData.proposals);
        setAiSnapshot(snapshotData);
        setWineItems(wineData);
      })
      .catch((err) => console.error("Failed to fetch supervisor data:", err))
      .finally(() => setLoading(false));
  }, []);

  const refreshUnified = useCallback(() => {
    reportsApi
      .unified({
        from: unifiedFrom || undefined,
        to: unifiedTo || undefined,
      })
      .then(setUnifiedReport)
      .catch((error) => console.error("Failed to refresh unified report:", error));
  }, [unifiedFrom, unifiedTo]);

  const refreshAi = useCallback(() => {
    Promise.all([
      aiOpsApi.proposals.list({ open: true, limit: 20 }),
      aiOpsApi.kitchenOperationalInsights(14),
    ])
      .then(([proposalsData, snapshotData]) => {
        setAiProposals(proposalsData.proposals);
        setAiSnapshot(snapshotData);
      })
      .catch((error) => console.error("Failed to refresh AI ops data:", error));
  }, []);

  const generateProposals = useCallback(() => {
    aiOpsApi.proposals
      .generate({ days: 14, status: "pending_review" })
      .then(() => refreshAi())
      .catch((error) => console.error("Failed to generate proposals:", error));
  }, [refreshAi]);

  const reviewProposal = useCallback(
    (id: string, action: "approve" | "reject" | "cancel") => {
      aiOpsApi.proposals
        .review(id, { action })
        .then(() => refreshAi())
        .catch((error) => console.error("Failed to review proposal:", error));
    },
    [refreshAi],
  );

  const applyProposal = useCallback(
    (id: string) => {
      aiOpsApi.proposals
        .apply(id)
        .then(() => refreshAi())
        .catch((error) => console.error("Failed to apply proposal:", error));
    },
    [refreshAi],
  );

  /* ---- derived KPIs ---- */
  const incassoLordo = useMemo(
    () => archivedOrders.filter((o) => o.status === "completato").reduce((s, o) => s + o.total, 0),
    [archivedOrders],
  );
  const totaleStorni = storni.reduce((s, st) => s + st.importo, 0);
  const incassoNetto = incassoLordo - totaleStorni;
  const ordiniCompletati = archivedOrders.filter((o) => o.status === "completato").length;
  const scontrinoMedio = ordiniCompletati > 0 ? incassoLordo / ordiniCompletati : 0;
  const ordiniAttivi = orders.filter((o) => o.status !== "chiuso" && o.status !== "annullato").length;
  const activeStaff = staffMembers.filter((s) => s.status === "attivo");
  const occupiedRooms = unifiedReport?.occupancy.occupiedRooms ?? hotelRooms.filter((room) => room.status === "occupata").length;
  const hotelRevenue = unifiedReport?.hotelRevenue ?? hotelReservations.reduce((sum, reservation) => sum + reservation.rate, 0);
  const integratedRevenue =
    unifiedReport?.integratedRoomChargeRevenue ??
    folioCharges.filter((charge) => charge.source === "restaurant").reduce((sum, charge) => sum + charge.amount, 0);
  const realFoodCost = unifiedReport?.realCosts?.foodCost ?? 0;
  const realStaffCost = unifiedReport?.realCosts?.staffCost ?? 0;
  const activeShifts = unifiedReport?.staffOps?.activeShifts ?? staffShifts.filter((s) => s.clockOutAt == null).length;

  const menuCategorie = useMemo(
    () => ["tutti", ...Array.from(new Set(menuItems.map((m) => m.category)))],
    [menuItems],
  );

  /* ---- handlers ---- */
  async function handleAddStorno() {
    if (!sImporto || !sMotivo.trim()) return;
    const importo = parseFloat(sImporto);
    if (!Number.isFinite(importo) || importo <= 0) {
      setStornoSaveError(t("supervisor.storno.invalidAmount"));
      return;
    }
    setStornoSaving(true);
    setStornoSaveError(null);
    try {
      const row = await supervisorStorniApi.create({
        amount: importo,
        motivo: sMotivo.trim(),
        tavolo: sTavolo,
        ordineId: sOrdineId,
        note: sNote,
      });
      setStorni((p) => [mapDtoToStorno(row), ...p]);
      setSImporto("");
      setSMotivo("");
      setSTavolo("");
      setSOrdineId("");
      setSNote("");
    } catch (e) {
      setStornoSaveError(e instanceof Error ? e.message : t("supervisor.storno.saveFailed"));
    } finally {
      setStornoSaving(false);
    }
  }

  /* ---- table columns ---- */
  const storicoColonne = [
    { key: "createdAt" as const, header: t("ui.datetime"), render: (r: Order) => <span className="whitespace-nowrap text-rw-ink">{r.createdAt}</span> },
    { key: "table" as const, header: t("supervisor.table"), render: (r: Order) => r.table ?? "—" },
    { key: "area" as const, header: t("supervisor.area") },
    {
      key: "status" as const, header: t("ui.status"),
      render: (r: Order) => {
        const t: Record<string, string> = {
          pending: "bg-violet-500/15 text-violet-300",
          chiuso: "bg-emerald-500/15 text-emerald-400",
          servito: "bg-emerald-500/15 text-emerald-400",
          in_attesa: "bg-amber-500/15 text-amber-400",
          in_preparazione: "bg-amber-500/15 text-amber-400",
          pronto: "bg-blue-500/15 text-blue-400",
          annullato: "bg-red-500/15 text-red-400",
        };
        return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", t[r.status] ?? "")}>{r.status.replace("_", " ")}</span>;
      },
    },
    {
      key: "onlinePaymentStatus" as const,
      header: t("supervisor.onlinePayment"),
      render: (r: Order) => (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            r.onlinePaymentStatus === "paid" ? "bg-emerald-500/15 text-emerald-300" : "bg-rw-muted/30 text-rw-soft",
          )}
        >
          {r.onlinePaymentStatus === "paid" ? "paid" : "unpaid"}
        </span>
      ),
    },
    { key: "covers" as const, header: t("supervisor.covers"), render: (r: Order) => r.covers ?? "—" },
    { key: "waiter" as const, header: t("supervisor.waiter") },
    { key: "id" as const, header: t("supervisor.total"), render: (r: Order) => <span className="font-semibold text-rw-ink">€{r.items.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0).toFixed(2)}</span> },
  ];

  const storniColonne = [
    { key: "dataOra" as const, header: t("ui.datetime"), render: (r: Storno) => <span className="whitespace-nowrap">{r.dataOra}</span> },
    { key: "importo" as const, header: t("supervisor.amount"), render: (r: Storno) => <span className="font-semibold text-red-400">€{r.importo.toFixed(2)}</span> },
    { key: "motivo" as const, header: t("supervisor.storno.reason") },
    { key: "tavolo" as const, header: t("supervisor.table") },
    { key: "ordineId" as const, header: t("supervisor.orderId") },
    { key: "note" as const, header: t("ui.notes") },
  ];

  const menuColonne = [
    { key: "name" as const, header: t("supervisor.dish"), render: (r: ApiMenuItem) => <span className="font-medium text-rw-ink">{r.name}</span> },
    { key: "category" as const, header: t("supervisor.category") },
    { key: "price" as const, header: t("supervisor.price"), render: (r: ApiMenuItem) => <span>€{r.price.toFixed(2)}</span> },
    {
      key: "active" as const, header: t("ui.status"),
      render: (r: ApiMenuItem) => (
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", r.active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")}>
          {r.active ? t("supervisor.available") : t("supervisor.outOfStock")}
        </span>
      ),
    },
  ];

  const inventoryColonne = [
    { key: "name" as const, header: t("supervisor.product"), render: (r: StockItem) => <span className="font-medium text-rw-ink">{r.name}</span> },
    { key: "category" as const, header: t("supervisor.category") },
    { key: "qty" as const, header: t("supervisor.available"), render: (r: StockItem) => `${r.qty} ${r.unit}` },
    {
      key: "minStock" as const, header: t("ui.status"),
      render: (r: StockItem) => {
        const isLow = r.qty <= r.minStock;
        return (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", isLow ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400")}>
            {isLow ? t("supervisor.belowThreshold") : "OK"}
          </span>
        );
      },
    },
  ];

  /* ---- filtered data ---- */
  const filteredStorico = useMemo(
    () => orders.filter((o) => {
      if (!storicoFilter) return true;
      const q = storicoFilter.toLowerCase();
      return o.waiter.toLowerCase().includes(q) || (o.table ?? "").toLowerCase().includes(q);
    }),
    [orders, storicoFilter],
  );

  const filteredMenu = useMemo(
    () => menuItems.filter((m) => {
      if (menuCatFilter !== "tutti" && m.category !== menuCatFilter) return false;
      if (menuFilter && !m.name.toLowerCase().includes(menuFilter.toLowerCase())) return false;
      return true;
    }),
    [menuItems, menuCatFilter, menuFilter],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-rw-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header + KPIs */}
      <PageHeader title={t("supervisor.title")} subtitle={t("supervisor.subtitle")}>
        <Chip label={t("supervisor.grossRevenue")} value={`€${incassoLordo.toFixed(2)}`} tone="success" />
        <Chip label={t("supervisor.tab.storni")} value={`€${totaleStorni.toFixed(2)}`} tone={totaleStorni > 0 ? "danger" : "default"} />
        <Chip label={t("supervisor.netRevenue")} value={`€${incassoNetto.toFixed(2)}`} tone="accent" />
        <Chip label={t("supervisor.warehouseValue")} value={`€${totalStockValue.toFixed(2)}`} />
        <Chip label={t("supervisor.lowStock")} value={lowStockItems.length} tone={lowStockItems.length > 0 ? "danger" : "default"} />
        <Chip label={t("supervisor.stockAlerts")} value={warehouseAlerts.length} tone={warehouseAlerts.length > 0 ? "danger" : "default"} />
        <Chip label={t("supervisor.activeShifts")} value={activeShifts} tone={activeShifts > 0 ? "accent" : "default"} />
        <Chip label={t("owner.forecast7d")} value={`€ ${(trends?.forecast.next7.projectedRevenue ?? 0).toFixed(2)}`} />
        <Chip label={t("owner.forecast30d")} value={`€ ${(trends?.forecast.next30.projectedRevenue ?? 0).toFixed(2)}`} />
        <AiToggleButton onClick={() => setAiOpen(true)} label="AI Supervisor" />
      </PageHeader>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* ============================================================ */}
      {/*  TAB: Report                                                  */}
      {/* ============================================================ */}
      {tab === "report" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={BadgeEuro} label={t("supervisor.grossRevenue")} value={`€${incassoLordo.toFixed(2)}`} trend="up" sub={t("supervisor.completedOrders")} />
            <MetricCard icon={XCircle} label={t("supervisor.tab.storni")} value={`€${totaleStorni.toFixed(2)}`} trend={totaleStorni > 0 ? "down" : "neutral"} sub={`${storni.length} ${t("supervisor.operations")}`} />
            <MetricCard icon={DollarSign} label={t("supervisor.netRevenue")} value={`€${incassoNetto.toFixed(2)}`} trend="up" sub={t("supervisor.grossMinusStorni")} />
            <MetricCard icon={TrendingUp} label={t("supervisor.avgTicket")} value={`€${scontrinoMedio.toFixed(2)}`} trend="up" sub={t("supervisor.perCompletedOrder")} />
            <MetricCard icon={Users} label={t("supervisor.activeStaff")} value={String(activeStaff.length)} sub={`${t("supervisor.outOf")} ${staffMembers.length}`} />
            <MetricCard icon={Clock} label={t("supervisor.openShifts")} value={String(activeShifts)} sub={t("supervisor.activeLogins")} />
            <MetricCard icon={ShoppingCart} label={t("supervisor.activeOrders")} value={String(ordiniAttivi)} tone="accent" sub={t("supervisor.inProgressNow")} />
            <MetricCard icon={ClipboardList} label={t("supervisor.archivedOrders")} value={String(archivedOrders.length)} sub={t("supervisor.totalArchive")} />
            <MetricCard icon={UtensilsCrossed} label={t("supervisor.activeDishes")} value={String(menuItems.filter((m) => m.active).length)} sub={`${t("supervisor.outOf")} ${menuItems.length}`} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card
              title={t("supervisor.aiQueue")}
              description={t("supervisor.aiQueueDesc")}
              headerRight={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rw-soft hover:bg-rw-surfaceAlt"
                    onClick={refreshAi}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> {t("ui.refresh")}
                  </button>
                  <button type="button" className={btnPrimary} onClick={generateProposals}>
                    <FileText className="h-4 w-4" /> {t("supervisor.generateProposals")}
                  </button>
                </div>
              }
            >
              <div className="space-y-3">
                {aiSnapshot && (
                  <div className="grid gap-2 sm:grid-cols-4">
                    <Chip label="Loss dishes" value={aiSnapshot.kpi.lossDishes} tone={aiSnapshot.kpi.lossDishes > 0 ? "danger" : "default"} />
                    <Chip label="Low margin" value={aiSnapshot.kpi.lowMarginDishes} tone={aiSnapshot.kpi.lowMarginDishes > 0 ? "warn" : "default"} />
                    <Chip label="Scadenze" value={aiSnapshot.kpi.expiringLots} tone={aiSnapshot.kpi.expiringLots > 0 ? "danger" : "default"} />
                    <Chip label="Prodotti fermi" value={aiSnapshot.kpi.stagnantProducts} tone={aiSnapshot.kpi.stagnantProducts > 0 ? "warn" : "default"} />
                  </div>
                )}
                {aiSnapshot && (
                  <div className="rounded-xl bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-soft">
                    <span className="font-semibold text-rw-ink">Manager:</span> {aiSnapshot.managerReport.headline}
                  </div>
                )}
                <div className="space-y-2">
                  {(aiProposals.length > 0 ? aiProposals : []).slice(0, 8).map((proposal) => (
                    <div key={proposal.id} className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-rw-ink">{proposal.title}</p>
                          <p className="text-xs text-rw-muted">{proposal.type} • {proposal.status}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {proposal.status === "pending_review" && (
                            <>
                              <button type="button" className="rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-400" onClick={() => reviewProposal(proposal.id, "approve")}>{t("supervisor.approve")}</button>
                              <button type="button" className="rounded-lg bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-400" onClick={() => reviewProposal(proposal.id, "reject")}>{t("supervisor.reject")}</button>
                            </>
                          )}
                          {proposal.status === "approved" && (
                            <button type="button" className="rounded-lg bg-rw-accent/15 px-2 py-1 text-xs font-semibold text-rw-accent" onClick={() => applyProposal(proposal.id)}>{t("supervisor.apply")}</button>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-rw-soft">{proposal.summary}</p>
                    </div>
                  ))}
                  {aiProposals.length === 0 && (
                    <p className="rounded-xl bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-muted">
                      {t("supervisor.noProposals")}
                    </p>
                  )}
                </div>
              </div>
            </Card>
            <Card title={t("supervisor.staffSummary")} description={t("supervisor.staffSummaryDesc")}>
              <ul className="space-y-2">
                {[
                  { l: t("supervisor.activeStaff"), v: `${activeStaff.length} / ${staffMembers.length}` },
                  { l: t("staff.leaveType.ferie"), v: String(staffMembers.filter((s) => s.status === "ferie").length) },
                  { l: t("staff.leaveType.malattia"), v: String(staffMembers.filter((s) => s.status === "malattia").length) },
                  { l: t("supervisor.warehouseValue"), v: `€${totalStockValue.toFixed(2)}` },
                ].map((r) => (
                  <li key={r.l} className="flex items-center justify-between rounded-xl bg-rw-surfaceAlt px-3 py-2">
                    <span className="text-sm text-rw-soft">{r.l}</span>
                    <span className="font-semibold text-rw-ink">{r.v}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title={t("supervisor.warehouseSummary")} description={t("supervisor.warehouseSummaryDesc")}>
              <ul className="space-y-2">
                {[
                  { l: t("supervisor.totalProducts"), v: String(stockItems.length) },
                  { l: t("supervisor.lowStock"), v: String(lowStockItems.length) },
                  { l: t("supervisor.totalValue"), v: `€${totalStockValue.toFixed(2)}` },
                  { l: t("supervisor.categories"), v: String(new Set(stockItems.map((s) => s.category)).size) },
                ].map((r) => (
                  <li key={r.l} className="flex items-center justify-between rounded-xl bg-rw-surfaceAlt px-3 py-2">
                    <span className="text-sm text-rw-soft">{r.l}</span>
                    <span className="font-semibold text-rw-ink">{r.v}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card title={t("supervisor.realCosts")} description={t("supervisor.realCostsDesc")}>
              <ul className="space-y-2">
                {[
                  { l: t("supervisor.realFoodCost"), v: `€${realFoodCost.toFixed(2)}` },
                  { l: t("supervisor.realStaffCost"), v: `€${realStaffCost.toFixed(2)}` },
                  { l: t("supervisor.totalCost"), v: `€${(realFoodCost + realStaffCost).toFixed(2)}` },
                  { l: t("supervisor.operatingMargin"), v: `€${(unifiedReport?.realCosts?.margin ?? 0).toFixed(2)}` },
                ].map((r) => (
                  <li key={r.l} className="flex items-center justify-between rounded-xl bg-rw-surfaceAlt px-3 py-2">
                    <span className="text-sm text-rw-soft">{r.l}</span>
                    <span className="font-semibold text-rw-ink">{r.v}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title={t("supervisor.stockAlerts")} description={t("supervisor.stockAlertsDesc")}>
              <ul className="space-y-2">
                {(warehouseAlerts.length > 0 ? warehouseAlerts.slice(0, 6) : [{ id: "none", name: t("supervisor.noAlerts"), qty: 0, minStock: 0, level: "warning", message: t("supervisor.stockOk") }]).map((alert) => (
                  <li key={alert.id} className="rounded-xl bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-soft">
                    <span className={cn("font-semibold", alert.level === "critical" ? "text-red-400" : "text-amber-400")}>{alert.name}</span>
                    <span className="ml-2">{alert.message}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card
            title={t("supervisor.activeOrdersDetail")}
            headerRight={
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rw-muted" />
                <input
                  className={cn(inputCls, "w-48 py-1.5 pl-8 text-xs")}
                  placeholder={t("supervisor.filterTableWaiter")}
                  value={storicoFilter}
                  onChange={(e) => setStoricoFilter(e.target.value)}
                />
              </div>
            }
          >
            <DataTable
              columns={storicoColonne}
              data={orders.filter((o) => o.status !== "chiuso" && o.status !== "annullato")}
              keyExtractor={(r) => r.id}
              emptyMessage={t("supervisor.noActiveOrders")}
            />
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/*  TAB: Storico                                                 */}
      {/* ============================================================ */}
      {tab === "storico" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rw-muted" />
              <input className={cn(inputCls, "pl-8")} placeholder={t("supervisor.filterTableWaiter")} value={storicoFilter} onChange={(e) => setStoricoFilter(e.target.value)} />
            </div>
          </div>
          <DataTable columns={storicoColonne} data={filteredStorico} keyExtractor={(r) => r.id} emptyMessage={t("supervisor.noOrdersFound")} />
        </div>
      )}

      {/* ============================================================ */}
      {/*  TAB: Storni                                                  */}
      {/* ============================================================ */}
      {tab === "storni" && (
        <div className="space-y-6">
          <Card title={t("supervisor.storno.newTitle")} description={t("supervisor.storno.newDesc")}>
            <div className="grid gap-3 sm:grid-cols-2">
              {stornoSaveError && (
                <div className="sm:col-span-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {stornoSaveError}
                </div>
              )}
              <div><label className={labelCls}>{t("supervisor.amount")} (€)</label><input type="number" step="0.01" className={inputCls} value={sImporto} onChange={(e) => setSImporto(e.target.value)} placeholder="0.00" /></div>
              <div><label className={labelCls}>{t("supervisor.storno.reason")}</label><input className={inputCls} value={sMotivo} onChange={(e) => setSMotivo(e.target.value)} placeholder={t("supervisor.storno.reasonPlaceholder")} /></div>
              <div><label className={labelCls}>{t("supervisor.table")}</label><input className={inputCls} value={sTavolo} onChange={(e) => setSTavolo(e.target.value)} placeholder="T1" /></div>
              <div><label className={labelCls}>{t("supervisor.orderId")}</label><input className={inputCls} value={sOrdineId} onChange={(e) => setSOrdineId(e.target.value)} placeholder="o1" /></div>
              <div className="sm:col-span-2"><label className={labelCls}>{t("ui.notes")}</label><textarea className={cn(inputCls, "resize-y")} rows={2} value={sNote} onChange={(e) => setSNote(e.target.value)} placeholder={t("ui.details")} /></div>
              <div className="sm:col-span-2">
                <button type="button" className={btnPrimary} disabled={stornoSaving} onClick={() => void handleAddStorno()}>
                  {stornoSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  {t("supervisor.storno.register")}
                </button>
              </div>
            </div>
          </Card>

          <Card title={t("supervisor.storno.listTitle")} description={`${storni.length} ${t("supervisor.storno.registered")}`}>
            <DataTable columns={storniColonne} data={storni} keyExtractor={(r) => r.id} emptyMessage={t("supervisor.storno.empty")} />
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard icon={XCircle} label={t("supervisor.storno.totalAmount")} value={`€${totaleStorni.toFixed(2)}`} trend="down" />
            <MetricCard icon={BarChart3} label={t("supervisor.storno.count")} value={String(storni.length)} />
            <MetricCard icon={DollarSign} label={t("supervisor.storno.avg")} value={`€${storni.length ? (totaleStorni / storni.length).toFixed(2) : "0.00"}`} />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  TAB: Menù                                                    */}
      {/* ============================================================ */}
      {tab === "menu" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 rounded-xl border border-rw-line bg-rw-surfaceAlt p-1">
              {menuCategorie.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setMenuCatFilter(c)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition",
                    menuCatFilter === c ? "bg-rw-accent/15 text-rw-accent" : "text-rw-muted hover:text-rw-soft",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rw-muted" />
              <input className={cn(inputCls, "pl-8")} placeholder={t("supervisor.searchDish")} value={menuFilter} onChange={(e) => setMenuFilter(e.target.value)} />
            </div>
          </div>

          <DataTable columns={menuColonne} data={filteredMenu} keyExtractor={(r) => r.id} emptyMessage={t("supervisor.noDishFound")} />
        </div>
      )}

      {/* ============================================================ */}
      {/*  TAB: Cantina                                                  */}
      {/* ============================================================ */}
      {tab === "cantina" && (
        <SupervisorCantinaTab wines={wineItems} t={t} />
      )}

      {/* ============================================================ */}
      {/*  TAB: Magazzino                                               */}
      {/* ============================================================ */}
      {tab === "magazzino" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard icon={Package} label={t("supervisor.totalProducts")} value={String(stockItems.length)} sub={t("supervisor.inWarehouse")} />
            <MetricCard icon={Box} label={t("supervisor.lowStock")} value={String(lowStockItems.length)} trend={lowStockItems.length > 0 ? "down" : "neutral"} sub={t("supervisor.toReorder")} />
            <MetricCard icon={ChefHat} label={t("supervisor.totalValue")} value={`€${totalStockValue.toFixed(2)}`} sub={t("supervisor.stockValue")} />
          </div>

          <Card
            title={t("supervisor.inventory")}
            description={`${stockItems.length} ${t("supervisor.products")}`}
            headerRight={
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rw-accent hover:bg-rw-accent/10"
                onClick={() => {
                  warehouseApi.list().then((data) => {
                    setStockItems(data.items);
                    setLowStockItems(data.lowStock);
                    setTotalStockValue(data.totalValue);
                  });
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" /> {t("ui.refresh")}
              </button>
            }
          >
            <DataTable columns={inventoryColonne} data={stockItems} keyExtractor={(r) => r.id} emptyMessage={t("supervisor.emptyWarehouse")} />
          </Card>
        </div>
      )}

      {tab === "unified" && (
        <div className="space-y-6">
          <Card title={t("supervisor.periodFilter")} description={t("supervisor.periodFilterDesc")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:w-44">
                <label className={labelCls}>{t("ui.from")}</label>
                <input
                  type="date"
                  className={inputCls}
                  value={unifiedFrom}
                  onChange={(event) => setUnifiedFrom(event.target.value)}
                />
              </div>
              <div className="w-full sm:w-44">
                <label className={labelCls}>{t("ui.to")}</label>
                <input
                  type="date"
                  className={inputCls}
                  value={unifiedTo}
                  onChange={(event) => setUnifiedTo(event.target.value)}
                />
              </div>
              <button type="button" className={btnPrimary} onClick={refreshUnified}>
                <RefreshCw className="h-4 w-4" /> {t("supervisor.updateKpi")}
              </button>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={BedDouble as typeof DollarSign}
              label={t("supervisor.occupiedRooms")}
              value={String(occupiedRooms)}
              sub={`${t("supervisor.outOf")} ${unifiedReport?.occupancy.totalRooms ?? hotelRooms.length}`}
            />
            <MetricCard icon={BadgeEuro} label={t("supervisor.hotelRevenue")} value={`€${hotelRevenue.toFixed(2)}`} sub={t("supervisor.totalStays")} />
            <MetricCard icon={CreditCard as typeof DollarSign} label={t("supervisor.roomCharge")} value={`€${integratedRevenue.toFixed(2)}`} sub={t("supervisor.restaurantOnRoom")} />
            <MetricCard icon={ClipboardList} label="Folios" value={String(folios.length)} sub={t("supervisor.guestAccounts")} />
          </div>

          <Card title={t("supervisor.unifiedReport")} description={t("supervisor.unifiedReportDesc")}>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
                <p className="font-semibold text-rw-ink">{t("supervisor.restaurantRevenue")}</p>
                <p className="mt-2 font-display text-2xl font-semibold text-rw-ink">€{incassoNetto.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
                <p className="font-semibold text-rw-ink">{t("supervisor.hotelRevenue")}</p>
                <p className="mt-2 font-display text-2xl font-semibold text-rw-ink">€{hotelRevenue.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
                <p className="font-semibold text-rw-ink">{t("supervisor.integratedValue")}</p>
                <p className="mt-2 font-display text-2xl font-semibold text-rw-ink">€{(incassoNetto + hotelRevenue).toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card title={t("supervisor.boardMix")} description={t("supervisor.boardMixDesc")}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(["room_only", "bed_breakfast", "half_board", "full_board"] as const).map((boardType) => (
                <div key={boardType} className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
                  <p className="text-sm font-medium text-rw-muted">{boardType}</p>
                  <p className="mt-2 font-display text-3xl font-semibold text-rw-ink">
                    {unifiedReport?.boardMix[boardType] ??
                      hotelReservations.filter((reservation) => reservation.boardType === boardType).length}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <AiChat context="supervisor" open={aiOpen} onClose={() => setAiOpen(false)} title="AI Supervisor" />
    </div>
  );
}

/* ================================================================== */
/*  Sub-component: Supervisor Cantina Tab                               */
/* ================================================================== */

const WINE_COLOR_STYLES: Record<string, string> = {
  rosso: "bg-red-500/15 text-red-400",
  bianco: "bg-amber-100/15 text-amber-300",
  "rosé": "bg-pink-500/15 text-pink-400",
  bollicine: "bg-yellow-400/15 text-yellow-300",
  passito: "bg-orange-500/15 text-orange-400",
  orange: "bg-orange-400/15 text-orange-300",
};

function SupervisorCantinaTab({ wines, t }: { wines: WineCellarItem[]; t: (key: string) => string }) {
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState("tutti");

  const colors = useMemo(
    () => ["tutti", ...Array.from(new Set(wines.map((w) => w.color)))],
    [wines],
  );

  const filtered = useMemo(
    () =>
      wines.filter((w) => {
        if (colorFilter !== "tutti" && w.color !== colorFilter) return false;
        if (search && !w.name.toLowerCase().includes(search.toLowerCase()) && !w.producer.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [wines, colorFilter, search],
  );

  const totalValue = useMemo(
    () => wines.reduce((s, w) => s + w.sellingPrice * w.stock, 0),
    [wines],
  );
  const totalBottles = useMemo(
    () => wines.reduce((s, w) => s + w.stock, 0),
    [wines],
  );
  const lowStockCount = useMemo(
    () => wines.filter((w) => w.stock > 0 && w.stock <= 3).length,
    [wines],
  );
  const outOfStockCount = useMemo(
    () => wines.filter((w) => w.stock === 0).length,
    [wines],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard icon={Wine} label={t("supervisor.cantina.labels")} value={String(wines.length)} sub={t("supervisor.cantina.inCellar")} />
        <MetricCard icon={Package} label={t("supervisor.cantina.stock")} value={String(totalBottles)} sub={t("supervisor.cantina.bottles")} />
        <MetricCard icon={DollarSign} label={t("supervisor.cantina.value")} value={`€${totalValue.toFixed(0)}`} sub={t("supervisor.cantina.stockValue")} />
        <MetricCard icon={ShoppingCart} label={t("supervisor.cantina.alerts")} value={String(lowStockCount + outOfStockCount)} trend={lowStockCount + outOfStockCount > 0 ? "down" : "neutral"} sub={`${outOfStockCount} ${t("supervisor.cantina.outOfStock")}`} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-rw-line bg-rw-surfaceAlt p-1">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColorFilter(c)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition",
                colorFilter === c ? "bg-rw-accent/15 text-rw-accent" : "text-rw-muted hover:text-rw-soft",
              )}
            >
              {c === "tutti" ? t("supervisor.cantina.allColors") : t(`cantina.color.${c}`)}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rw-muted" />
          <input className={cn(inputCls, "pl-8")} placeholder={t("supervisor.cantina.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card title={t("supervisor.cantina.title")} description={`${filtered.length} ${t("supervisor.cantina.wines")}`}>
        <DataTable
          columns={[
            {
              key: "name" as const,
              header: t("supervisor.dish"),
              render: (r: WineCellarItem) => (
                <div>
                  <span className="font-medium text-rw-ink">{r.name}</span>
                  {r.vintageYear && <span className="ml-1.5 text-xs text-rw-muted">{r.vintageYear}</span>}
                </div>
              ),
            },
            { key: "producer" as const, header: t("supervisor.cantina.producer") },
            {
              key: "color" as const,
              header: t("supervisor.cantina.color"),
              render: (r: WineCellarItem) => (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", WINE_COLOR_STYLES[r.color] ?? "bg-rw-surfaceAlt text-rw-muted")}>
                  {t(`cantina.color.${r.color}`)}
                </span>
              ),
            },
            {
              key: "sellingPrice" as const,
              header: t("supervisor.price"),
              render: (r: WineCellarItem) => <span className="font-bold">€{r.sellingPrice.toFixed(2)}</span>,
            },
            {
              key: "purchasePrice" as const,
              header: t("supervisor.cantina.purchasePrice"),
              render: (r: WineCellarItem) => <span className="text-rw-muted">€{r.purchasePrice.toFixed(2)}</span>,
            },
            {
              key: "stock" as const,
              header: t("supervisor.available"),
              render: (r: WineCellarItem) => (
                <span className={cn("text-xs font-semibold", r.stock === 0 ? "text-red-400" : r.stock <= 3 ? "text-amber-400" : "text-emerald-400")}>
                  {r.stock}
                </span>
              ),
            },
            {
              key: "id" as const,
              header: t("supervisor.cantina.margin"),
              render: (r: WineCellarItem) => {
                if (r.sellingPrice <= 0 || r.purchasePrice <= 0) return <span className="text-rw-muted">—</span>;
                const m = ((r.sellingPrice - r.purchasePrice) / r.sellingPrice) * 100;
                return (
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", m >= 50 ? "bg-emerald-500/15 text-emerald-400" : m >= 30 ? "bg-amber-400/15 text-amber-400" : "bg-red-500/15 text-red-400")}>
                    {m.toFixed(0)}%
                  </span>
                );
              },
            },
          ]}
          data={filtered}
          keyExtractor={(r) => r.id}
          emptyMessage={t("supervisor.cantina.empty")}
        />
      </Card>
    </div>
  );
}
