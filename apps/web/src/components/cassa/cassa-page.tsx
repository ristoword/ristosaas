"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileText,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import { DataTable } from "@/components/shared/data-table";
import { AiChat } from "@/components/ai/ai-chat";
import {
  ordersApi,
  cassaApi,
  menuApi,
  cantinaApi,
  reportsApi,
  type Order,
  type MenuItem as ApiMenuItem,
  type WineCellarItem,
  type DailyClosureReport,
  type ReportTrendsSnapshot,
} from "@/lib/api-client";
import { CassaEnterpriseHeader } from "./enterprise/header";
import { CassaEnterpriseFooter } from "./enterprise/footer";
import { CassaEnterpriseTabs } from "./enterprise/tabs";
import { CassaEnterpriseWorkspace } from "./enterprise/workspace";
import { CASSA_AI_SUGGESTIONS } from "./enterprise/ai-suggestions";
import { CARD_BASE, INPUT_POS, LABEL_POS, TOUCH_BTN_SM } from "./enterprise/styles";

export function CassaPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("cassa");
  const [aiOpen, setAiOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([]);
  const [wineItems, setWineItems] = useState<WineCellarItem[]>([]);
  const [trends, setTrends] = useState<ReportTrendsSnapshot | null>(null);
  const [lastClosureDate, setLastClosureDate] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    return Promise.all([
      ordersApi.list(),
      menuApi.listItems(),
      cantinaApi.list().catch(() => [] as WineCellarItem[]),
    ])
      .then(([ordersData, menuData, wineData]) => {
        setOrders(ordersData);
        setMenuItems(menuData);
        setWineItems(wineData);
      })
      .catch((err) => console.error("Failed to fetch cassa data:", err));
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
    reportsApi.trends().then(setTrends).catch(() => setTrends(null));
    reportsApi.daily
      .list()
      .then((rows) => setLastClosureDate(rows[0]?.date ?? null))
      .catch(() => setLastClosureDate(null));
  }, [fetchData]);

  const servedOrders = useMemo(
    () => orders.filter((o) => o.status === "servito" || o.status === "conto_richiesto"),
    [orders],
  );
  const tavoliDaChiudere = useMemo(
    () => new Set(servedOrders.filter((o) => o.table).map((o) => o.table)).size,
    [servedOrders],
  );
  const incassoSimulato = useMemo(
    () =>
      servedOrders.reduce(
        (sum, o) => sum + o.items.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0),
        0,
      ),
    [servedOrders],
  );

  const handleCloseTable = useCallback(
    async (orderIds: string[], opts?: { discount?: number; vatRate?: number; paymentMethod?: string }) => {
      if (!orderIds.length) return null;
      try {
        const result = await cassaApi.closeTable({
          orderIds,
          discount: opts?.discount,
          vatRate: opts?.vatRate,
          paymentMethod: opts?.paymentMethod ?? "contanti",
        });
        setOrders((prev) =>
          prev.map((o) =>
            result.closedOrderIds.includes(o.id) ? { ...o, status: "chiuso" as const } : o,
          ),
        );
        return result;
      } catch (err) {
        console.error("Failed to close table:", err);
        throw err;
      }
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  const TABS = [
    { id: "cassa", label: t("cassa.tab.tables") },
    { id: "menu", label: t("cassa.tab.menuShort") },
    { id: "cantina", label: t("cassa.tab.cantina") },
    { id: "report", label: t("cassa.tab.report") },
  ];

  return (
    <div className="space-y-4 pb-4">
      <CassaEnterpriseHeader
        tavoliDaChiudere={tavoliDaChiudere}
        comandeServite={servedOrders.length}
        incassoSimulato={incassoSimulato}
        trends={trends}
        onAiOpen={() => setAiOpen(true)}
      />

      <CassaEnterpriseTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "cassa" && (
        <CassaEnterpriseWorkspace
          servedOrders={servedOrders}
          menuItems={menuItems}
          onCloseTable={handleCloseTable}
        />
      )}
      {tab === "menu" && <MenuTab menuItems={menuItems} setMenuItems={setMenuItems} />}
      {tab === "cantina" && <CantinaTab wines={wineItems} />}
      {tab === "report" && <ReportTab orders={orders} />}

      <CassaEnterpriseFooter lastClosureDate={lastClosureDate} />

      <AiChat
        context="cassa"
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        title={t("cassa.ai.label")}
        suggestedPrompts={CASSA_AI_SUGGESTIONS}
        panelClassName="w-[min(100vw,28rem)]"
      />
    </div>
  );
}

/* ================================================================== */
/*  Tab: Menù ufficiale                                                */
/* ================================================================== */

function MenuTab({
  menuItems,
  setMenuItems,
}: {
  menuItems: ApiMenuItem[];
  setMenuItems: React.Dispatch<React.SetStateAction<ApiMenuItem[]>>;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "",
    area: "cucina",
    price: 0,
    notes: "",
  });

  const filtered = useMemo(
    () =>
      menuItems.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.category.toLowerCase().includes(search.toLowerCase()),
      ),
    [menuItems, search],
  );

  async function addItem() {
    if (!form.name.trim()) return;
    try {
      const created = await menuApi.createItem({
        name: form.name,
        category: form.category,
        area: form.area,
        price: form.price,
        code: "",
        active: true,
        recipeId: null,
        notes: form.notes,
        foodCostPct: null,
      });
      setMenuItems((prev) => [...prev, created]);
      setForm({ name: "", category: "", area: "cucina", price: 0, notes: "" });
    } catch (err) {
      console.error("Failed to create menu item:", err);
    }
  }

  async function removeItem(id: string) {
    try {
      await menuApi.deleteItem(id);
      setMenuItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error("Failed to delete menu item:", err);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <section className={cn(CARD_BASE, "p-5")}>
        <h2 className="mb-1 font-display text-xl font-bold text-rw-ink">{t("cassa.menu.newDish")}</h2>
        <p className="mb-4 text-sm text-rw-muted">{t("cassa.menu.newDishDesc")}</p>
        <div className="space-y-4">
          <div>
            <label className={LABEL_POS}>{t("cassa.menu.dishName")}</label>
            <input
              className={INPUT_POS}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="es. Spaghetti allo scoglio"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_POS}>{t("cassa.menu.category")}</label>
              <input
                className={INPUT_POS}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Primi, Secondi…"
              />
            </div>
            <div>
              <label className={LABEL_POS}>{t("cassa.menu.area")}</label>
              <select
                className={INPUT_POS}
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              >
                <option value="cucina">{t("cassa.area.cucina")}</option>
                <option value="pizzeria">{t("cassa.area.pizzeria")}</option>
                <option value="bar">{t("cassa.area.bar")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL_POS}>{t("cassa.menu.price")}</label>
            <input
              type="number"
              min="0"
              step="0.50"
              className={INPUT_POS}
              value={form.price || ""}
              onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={LABEL_POS}>{t("ui.notes")}</label>
            <textarea
              className={cn(INPUT_POS, "resize-y min-h-[80px]")}
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Allergeni, varianti…"
            />
          </div>
          <button
            type="button"
            className={`${TOUCH_BTN_SM} w-full border border-[#D4AF37]/50 bg-[#D4AF37]/20 text-[#E8C547]`}
            onClick={addItem}
          >
            <Plus className="h-5 w-5" />
            {t("cassa.menu.addDish")}
          </button>
        </div>
      </section>

      <section className={cn(CARD_BASE, "p-5")}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-rw-ink">{t("cassa.menu.inMenu")}</h2>
            <p className="text-sm text-rw-muted">
              {filtered.length} {t("ui.dishesFound")}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-rw-muted" />
            <input
              className={cn(INPUT_POS, "pl-10")}
              placeholder={t("ui.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <DataTable
          columns={[
            { key: "name", header: t("ui.name") },
            { key: "category", header: t("cassa.menu.category") },
            { key: "area", header: t("cassa.menu.area") },
            {
              key: "price",
              header: t("cassa.col.price"),
              render: (r: ApiMenuItem) => `€ ${r.price.toFixed(2)}`,
            },
            {
              key: "active",
              header: t("ui.status"),
              render: (r: ApiMenuItem) => (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    r.active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400",
                  )}
                >
                  {r.active ? t("ui.active") : t("ui.inactive")}
                </span>
              ),
            },
            {
              key: "id",
              header: "",
              render: (r: ApiMenuItem) => (
                <button
                  type="button"
                  onClick={() => removeItem(r.id)}
                  className="min-h-[44px] min-w-[44px] text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              ),
            },
          ]}
          data={filtered}
          keyExtractor={(r) => r.id}
          emptyMessage={t("cassa.menu.notFound")}
        />
      </section>
    </div>
  );
}

/* ================================================================== */
/*  Tab: Cantina                                                       */
/* ================================================================== */

const COLOR_STYLES: Record<string, string> = {
  rosso: "bg-red-500/15 text-red-400",
  bianco: "bg-amber-100/15 text-amber-300",
  "rosé": "bg-pink-500/15 text-pink-400",
  bollicine: "bg-yellow-400/15 text-yellow-300",
  passito: "bg-orange-500/15 text-orange-400",
  orange: "bg-orange-400/15 text-orange-300",
};

function CantinaTab({ wines }: { wines: WineCellarItem[] }) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState("all");

  const colors = useMemo(
    () => ["all", ...Array.from(new Set(wines.map((w) => w.color)))],
    [wines],
  );

  const filtered = useMemo(
    () =>
      wines.filter((w) => {
        if (colorFilter !== "all" && w.color !== colorFilter) return false;
        if (
          search &&
          !w.name.toLowerCase().includes(search.toLowerCase()) &&
          !w.producer.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      }),
    [wines, colorFilter, search],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-2xl border border-rw-line bg-rw-surfaceAlt p-1">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColorFilter(c)}
              className={cn(
                "min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold capitalize transition",
                colorFilter === c
                  ? "bg-[#D4AF37]/20 text-[#E8C547]"
                  : "text-rw-muted hover:text-rw-soft",
              )}
            >
              {c === "all" ? t("cassa.cantina.all") : t(`cantina.color.${c}`)}
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-rw-muted" />
          <input
            className={cn(INPUT_POS, "pl-10")}
            placeholder={t("cassa.cantina.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <section className={cn(CARD_BASE, "p-5")}>
        <h2 className="mb-1 font-display text-xl font-bold text-rw-ink">{t("cassa.cantina.title")}</h2>
        <p className="mb-4 text-sm text-rw-muted">
          {filtered.length} {t("cassa.cantina.wines")}
        </p>
        <DataTable
          columns={[
            {
              key: "name" as const,
              header: t("cassa.cantina.col.name"),
              render: (r: WineCellarItem) => (
                <div>
                  <span className="font-medium text-rw-ink">{r.name}</span>
                  {r.vintageYear && (
                    <span className="ml-1.5 text-xs text-rw-muted">{r.vintageYear}</span>
                  )}
                </div>
              ),
            },
            {
              key: "producer" as const,
              header: t("cassa.cantina.col.producer"),
              render: (r: WineCellarItem) => (
                <span className="text-rw-soft">
                  {r.producer}
                  {r.country ? ` · ${r.country}` : ""}
                </span>
              ),
            },
            {
              key: "color" as const,
              header: t("cassa.cantina.col.color"),
              render: (r: WineCellarItem) => (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    COLOR_STYLES[r.color] ?? "bg-rw-surfaceAlt text-rw-muted",
                  )}
                >
                  {t(`cantina.color.${r.color}`)}
                </span>
              ),
            },
            {
              key: "sellingPrice" as const,
              header: t("cassa.cantina.col.price"),
              render: (r: WineCellarItem) => (
                <span className="font-bold text-rw-ink">€{r.sellingPrice.toFixed(2)}</span>
              ),
            },
            {
              key: "stock" as const,
              header: t("cassa.cantina.col.stock"),
              render: (r: WineCellarItem) => (
                <span
                  className={cn(
                    "text-xs font-semibold",
                    r.stock === 0 ? "text-red-400" : r.stock <= 3 ? "text-amber-400" : "text-emerald-400",
                  )}
                >
                  {r.stock} {t("cantina.bottles")}
                </span>
              ),
            },
            {
              key: "alcoholPct" as const,
              header: t("cassa.cantina.col.alcohol"),
              render: (r: WineCellarItem) => <span className="text-rw-muted">{r.alcoholPct}%</span>,
            },
          ]}
          data={filtered}
          keyExtractor={(r) => r.id}
          emptyMessage={t("cassa.cantina.empty")}
        />
      </section>
    </div>
  );
}

/* ================================================================== */
/*  Tab: Report                                                        */
/* ================================================================== */

function ReportTab({ orders }: { orders: Order[] }) {
  const { t } = useI18n();
  const [reports, setReports] = useState<DailyClosureReport[]>([]);
  const [form, setForm] = useState({ date: "", foodSpend: "", staffSpend: "", notes: "" });
  const [selectedReport, setSelectedReport] = useState<DailyClosureReport | null>(null);

  const todayRevenue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return orders
      .filter(
        (o) =>
          (o.status === "chiuso" || o.status === "servito") &&
          o.createdAt.slice(0, 10) === today,
      )
      .reduce((s, o) => s + o.items.reduce((a, i) => a + (i.price ?? 0) * i.qty, 0), 0);
  }, [orders]);

  useEffect(() => {
    reportsApi.daily
      .list()
      .then((rows) => {
        setReports(rows);
        setSelectedReport(rows[0] ?? null);
      })
      .catch((error) => console.error("Failed to fetch daily reports:", error));
  }, []);

  function saveReport() {
    if (!form.date) return;
    reportsApi.daily
      .upsert({
        date: form.date,
        foodSpend: parseFloat(form.foodSpend) || 0,
        staffSpend: parseFloat(form.staffSpend) || 0,
        revenue: todayRevenue,
        notes: form.notes,
      })
      .then((saved) => {
        setReports((prev) => {
          const next = prev.filter((report) => report.id !== saved.id);
          return [saved, ...next];
        });
        setSelectedReport(saved);
        setForm({ date: "", foodSpend: "", staffSpend: "", notes: "" });
      })
      .catch((error) => console.error("Failed to save daily report:", error));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <section className={cn(CARD_BASE, "p-5")}>
        <h2 className="mb-1 font-display text-xl font-bold text-rw-ink">{t("cassa.report.dailyClose")}</h2>
        <p className="mb-4 text-sm text-rw-muted">{t("cassa.report.fillDesc")}</p>
        <div className="space-y-4">
          <div>
            <label className={LABEL_POS}>{t("ui.date")}</label>
            <input
              type="date"
              className={INPUT_POS}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_POS}>{t("cassa.report.foodSpend")}</label>
              <input
                type="number"
                min="0"
                step="1"
                className={INPUT_POS}
                value={form.foodSpend}
                onChange={(e) => setForm({ ...form, foodSpend: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className={LABEL_POS}>{t("cassa.report.staffSpend")}</label>
              <input
                type="number"
                min="0"
                step="1"
                className={INPUT_POS}
                value={form.staffSpend}
                onChange={(e) => setForm({ ...form, staffSpend: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className={LABEL_POS}>{t("ui.notes")}</label>
            <textarea
              className={cn(INPUT_POS, "resize-y min-h-[80px]")}
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Osservazioni…"
            />
          </div>
          <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-4">
            <p className="text-xs text-rw-muted">{t("cassa.report.autoRevenue")}</p>
            <p className="font-display text-2xl font-semibold text-[#E8C547]">
              € {todayRevenue.toFixed(2)}
            </p>
          </div>
          <button
            type="button"
            className={`${TOUCH_BTN_SM} w-full border border-[#D4AF37]/50 bg-[#D4AF37]/20 text-[#E8C547]`}
            onClick={saveReport}
          >
            <Save className="h-5 w-5" />
            {t("cassa.report.save")}
          </button>
        </div>
      </section>

      <div className="space-y-4">
        <section className={cn(CARD_BASE, "p-5")}>
          <h2 className="mb-4 font-display text-xl font-bold text-rw-ink">
            {selectedReport
              ? `${t("cassa.report.detail")} — ${selectedReport.date}`
              : t("cassa.report.detail")}
          </h2>
          {!selectedReport ? (
            <div className="flex flex-col items-center gap-2 py-10 text-rw-muted">
              <FileText className="h-12 w-12 opacity-40" />
              <p className="text-sm">{t("cassa.report.selectFromHistory")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt px-4 py-4">
                  <p className="text-xs text-rw-muted">{t("cassa.report.foodSpend")}</p>
                  <p className="font-display text-lg font-semibold text-rw-ink">
                    € {selectedReport.foodSpend.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt px-4 py-4">
                  <p className="text-xs text-rw-muted">{t("cassa.report.staffSpend")}</p>
                  <p className="font-display text-lg font-semibold text-rw-ink">
                    € {selectedReport.staffSpend.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4">
                  <p className="text-xs text-emerald-400">{t("cassa.report.revenue")}</p>
                  <p className="font-display text-lg font-semibold text-emerald-300">
                    € {selectedReport.revenue.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt px-4 py-4">
                <p className="text-xs text-rw-muted">{t("cassa.report.estimatedMargin")}</p>
                <p className="font-display text-2xl font-semibold text-rw-ink">
                  €{" "}
                  {(
                    selectedReport.revenue -
                    selectedReport.foodSpend -
                    selectedReport.staffSpend
                  ).toFixed(2)}
                </p>
              </div>
              {selectedReport.notes && (
                <p className="text-sm text-rw-soft">{selectedReport.notes}</p>
              )}
            </div>
          )}
        </section>

        <section className={cn(CARD_BASE, "p-5")}>
          <h2 className="mb-4 font-display text-xl font-bold text-rw-ink">{t("cassa.report.history")}</h2>
          {reports.length === 0 ? (
            <p className="py-6 text-center text-sm text-rw-muted">{t("cassa.report.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedReport(r)}
                    className={cn(
                      "flex min-h-[80px] w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99]",
                      selectedReport?.id === r.id
                        ? "border-[#D4AF37] bg-[#D4AF37]/15 text-rw-ink"
                        : "border-rw-line bg-rw-surfaceAlt text-rw-soft hover:border-[#D4AF37]/30",
                    )}
                  >
                    <div>
                      <span className="font-semibold text-rw-ink">{r.date}</span>
                      {r.notes && (
                        <span className="ml-2 text-xs text-rw-muted">— {r.notes}</span>
                      )}
                    </div>
                    <span className="text-base font-semibold text-emerald-400">
                      € {r.revenue.toFixed(2)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
