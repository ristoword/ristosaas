"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Banknote,
  CreditCard,
  FileText,
  Loader2,
  Percent,
  Plus,
  Printer,
  QrCode,
  Receipt,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { TabBar } from "@/components/shared/tab-bar";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { AiChat, AiToggleButton } from "@/components/ai/ai-chat";
import { useHotel } from "@/components/hotel/hotel-context";
import { useTenantFeatures } from "@/components/auth/auth-context";
import {
  ordersApi,
  menuApi,
  reportsApi,
  type Order,
  type MenuItem as ApiMenuItem,
  type DailyClosureReport,
  type ReportTrendsSnapshot,
} from "@/lib/api-client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */


const INPUT =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";

const LABEL = "block text-xs font-semibold text-rw-muted mb-1";

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink transition hover:border-rw-accent/30 active:scale-[0.98]";

/* ------------------------------------------------------------------ */
/*  Pay Online Button                                                  */
/* ------------------------------------------------------------------ */

function PayOnlineButton({ total, tableLabel }: { total: number; tableLabel: string }) {
  const { t } = useI18n();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/cassa/payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total, description: `Conto${tableLabel ? ` — Tavolo ${tableLabel}` : ""}` }),
      });
      if (!res.ok) {
        console.error("Payment link failed:", res.status);
        return;
      }
      const data = await res.json();
      if (!data.url) return;
      setQrUrl(data.url);
      setOpen(true);
    } catch (e) {
      console.error("Payment link error:", e);
    } finally {
      setLoading(false);
    }
  }

  const qrImg = qrUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(qrUrl)}` : "";

  return (
    <>
      <button type="button" onClick={() => void generate()} disabled={loading || total <= 0}
        className={`${BTN_OUTLINE} gap-2`}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
        {t("cassa.payOnline")}
      </button>
      {open && qrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl border border-rw-line bg-rw-bg p-6 text-center shadow-2xl">
            <p className="font-display text-xl font-semibold text-rw-ink mb-1">{t("cassa.payWithQr")}</p>
            <p className="text-sm text-rw-muted mb-4">{t("ui.total")}: <span className="font-bold text-rw-accent">€ {total.toFixed(2)}</span></p>
            <div className="mx-auto mb-4 flex h-56 w-56 items-center justify-center rounded-2xl border border-rw-line bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImg} alt="QR pagamento" className="h-full w-full object-contain" />
            </div>
            <p className="text-xs text-rw-muted mb-4">{t("cassa.qr.scanDesc")}</p>
            <div className="flex gap-2">
              <button type="button" onClick={async () => { await navigator.clipboard.writeText(qrUrl); }}
                className="flex-1 rounded-xl border border-rw-line py-2 text-xs font-semibold text-rw-muted hover:bg-rw-surfaceAlt">{t("cassa.copyLink")}</button>
              <button type="button" onClick={() => { setOpen(false); setQrUrl(null); }}
                className="flex-1 rounded-xl bg-rw-accent py-2 text-xs font-semibold text-white">{t("ui.close")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CassaPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("cassa");
  const [aiOpen, setAiOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([]);
  const [trends, setTrends] = useState<ReportTrendsSnapshot | null>(null);

  const fetchData = useCallback(() => {
    return Promise.all([ordersApi.list(), menuApi.listItems()])
      .then(([ordersData, menuData]) => {
        setOrders(ordersData);
        setMenuItems(menuData);
      })
      .catch((err) => console.error("Failed to fetch cassa data:", err));
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
    reportsApi.trends().then(setTrends).catch(() => setTrends(null));
  }, [fetchData]);

  const servedOrders = useMemo(() => orders.filter((o) => o.status === "servito"), [orders]);
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

  const handleCloseTable = useCallback(async (orderId: string) => {
    try {
      await ordersApi.patchStatus(orderId, "chiuso");
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "chiuso" as const } : o)));
    } catch (err) {
      console.error("Failed to close order:", err);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-rw-accent" />
      </div>
    );
  }

  const TABS = [
    { id: "cassa", label: t("cassa.tab.tables") },
    { id: "menu", label: t("cassa.tab.menu") },
    { id: "report", label: t("cassa.tab.report") },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("cassa.title")} subtitle={t("cassa.subtitle")}>
        <Chip label={t("cassa.chip.tablesToClose")} value={tavoliDaChiudere} tone="warn" />
        <Chip label={t("cassa.chip.ordersServed")} value={servedOrders.length} tone="success" />
        <Chip label={t("cassa.chip.simulatedRevenue")} value={`€ ${incassoSimulato.toFixed(2)}`} tone="accent" />
        <Chip label={t("cassa.chip.trend7d")} value={`€ ${(trends?.week.revenue ?? 0).toFixed(2)}`} />
        <Chip label={t("cassa.chip.trend30d")} value={`€ ${(trends?.month.revenue ?? 0).toFixed(2)}`} />
        <Chip label={t("cassa.chip.forecast7d")} value={`€ ${(trends?.forecast.next7.projectedRevenue ?? 0).toFixed(2)}`} />
        <Chip label={t("cassa.chip.forecast30d")} value={`€ ${(trends?.forecast.next30.projectedRevenue ?? 0).toFixed(2)}`} />
        <AiToggleButton onClick={() => setAiOpen(true)} label={t("cassa.ai.label")} />
      </PageHeader>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === "cassa" && (
        <CassaTab
          servedOrders={servedOrders}
          onCloseTable={handleCloseTable}
        />
      )}
      {tab === "menu" && <MenuTab menuItems={menuItems} setMenuItems={setMenuItems} />}
      {tab === "report" && <ReportTab orders={orders} />}

      <AiChat context="cassa" open={aiOpen} onClose={() => setAiOpen(false)} title={t("cassa.ai.label")} />
    </div>
  );
}

/* ================================================================== */
/*  Tab: Cassa / Tavoli                                                */
/* ================================================================== */

function CassaTab({
  servedOrders,
  onCloseTable,
}: {
  servedOrders: Order[];
  onCloseTable: (id: string) => void;
}) {
  const { t } = useI18n();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [discount, setDiscount] = useState("");
  const [vatOverride, setVatOverride] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState("");
  const [serviceType, setServiceType] = useState<"breakfast" | "lunch" | "dinner">("dinner");
  const { reservations, roomCharge } = useHotel();
  const { isRestaurantEnabled, isHotelEnabled, isRoomChargeEnabled } = useTenantFeatures();
  const roomChargeEnabled = isRestaurantEnabled && isHotelEnabled && isRoomChargeEnabled;

  const grouped = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of servedOrders) {
      const key = o.table ?? "asporto";
      const arr = map.get(key) ?? [];
      arr.push(o);
      map.set(key, arr);
    }
    return map;
  }, [servedOrders]);

  const tableOrders = selectedTable ? (grouped.get(selectedTable) ?? []) : [];
  const selected = tableOrders.length > 0 ? tableOrders[0] : null;
  const allItems = tableOrders.flatMap((o) => o.items);

  const subtotal = allItems.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0);
  const discountVal = parseFloat(discount) || 0;
  const vatVal = parseFloat(vatOverride) || 10;
  const afterDiscount = subtotal - discountVal;
  const total = afterDiscount * (1 + vatVal / 100);
  const inHouseReservations = useMemo(
    () => reservations.filter((reservation) => reservation.status === "in_casa"),
    [reservations],
  );

  function doFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }

  async function handleRoomCharge() {
    if (!selected || !reservationId) return;
    const tableLabel = selected.table ? `tavolo ${selected.table}` : "asporto";
    const charge = await roomCharge(
      reservationId,
      selected.id,
      `Addebito ristorante ${tableLabel}`,
      Number(total.toFixed(2)),
      serviceType,
    );
    doFlash(`Addebito inviato al folio camera: € ${charge.amount.toFixed(2)}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card title={t("cassa.tables.title")} description={t("cassa.tables.selectDesc")}>
        {grouped.size === 0 && (
          <p className="py-6 text-center text-sm text-rw-muted">{t("cassa.tables.empty")}</p>
        )}
        <ul className="space-y-2">
          {[...grouped.entries()].map(([table, ords]) => (
            <li key={table}>
              <button
                type="button"
                onClick={() => setSelectedTable(table)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                  selectedTable === table
                    ? "border-rw-accent bg-rw-accent/10 text-rw-ink"
                    : "border-rw-line bg-rw-surfaceAlt text-rw-soft hover:border-rw-accent/25",
                )}
              >
                <span className="font-semibold">{table === "asporto" ? t("cassa.asporto") : `${t("ui.table")} ${table}`}</span>
                <span className="text-xs text-rw-muted">{ords.length} {t("ui.orders")}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title={selected ? `${t("ui.bill")} — ${selected.table ? `${t("ui.table")} ${selected.table}` : t("cassa.asporto")}` : t("cassa.report.detail")}
        description={selected ? `${t("cassa.col.waiter")}: ${selected.waiter} · ${t("cassa.col.covers")}: ${selected.covers ?? "–"}` : t("cassa.tables.selectDesc")}
      >
        {flash && (
          <p className="mb-4 rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-4 py-2.5 text-sm text-rw-ink" role="status">
            {flash}
          </p>
        )}

        {!selected ? (
          <div className="flex flex-col items-center gap-2 py-12 text-rw-muted">
            <Receipt className="h-10 w-10 opacity-40" />
            <p className="text-sm">{t("cassa.noTableSelected")}</p>
          </div>
        ) : (
          <>
            <div className="mb-4 overflow-x-auto rounded-xl border border-rw-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-rw-muted">{t("cassa.col.dish")}</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-rw-muted">{t("cassa.col.qty")}</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-rw-muted">{t("cassa.col.price")}</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-rw-muted">{t("ui.total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {allItems.map((item) => (
                    <tr key={item.id} className="border-b border-rw-line/40">
                      <td className="px-3 py-2 text-rw-ink">{item.name}</td>
                      <td className="px-3 py-2 text-center text-rw-soft">{item.qty}</td>
                      <td className="px-3 py-2 text-right text-rw-soft">€ {(item.price ?? 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium text-rw-ink">€ {((item.price ?? 0) * item.qty).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>{t("cassa.discount")}</label>
                <div className="relative">
                  <Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0.00"
                    className={cn(INPUT, "pl-9")}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL}>{t("cassa.vat")}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={vatOverride}
                  onChange={(e) => setVatOverride(e.target.value)}
                  placeholder="10"
                  className={INPUT}
                />
              </div>
            </div>

            <div className="mb-5 space-y-1 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm">
              <div className="flex justify-between text-rw-soft">
                <span>{t("cassa.subtotal")}</span>
                <span>€ {subtotal.toFixed(2)}</span>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>{t("ui.discount")}</span>
                  <span>− € {discountVal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-rw-soft">
                <span>{t("cassa.vat")} ({vatVal}%)</span>
                <span>€ {(afterDiscount * (vatVal / 100)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-rw-line pt-1 font-display text-lg font-semibold text-rw-ink">
                <span>{t("ui.total")}</span>
                <span>€ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {roomChargeEnabled && selected ? (
                <div className="flex w-full flex-col gap-3 rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
                  <div>
                    <p className="text-sm font-semibold text-rw-ink">{t("cassa.roomCharge.title")}</p>
                    <p className="text-xs text-rw-muted">{t("cassa.roomCharge.desc")}</p>
                  </div>
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="min-w-0 flex-1">
                      <label className={LABEL}>{t("cassa.roomCharge.reservation")}</label>
                      <select
                        className={INPUT}
                        value={reservationId}
                        onChange={(e) => setReservationId(e.target.value)}
                      >
                        <option value="">{t("cassa.roomCharge.selectGuest")}</option>
                        {inHouseReservations.map((reservation) => (
                          <option key={reservation.id} value={reservation.id}>
                            {reservation.guestName} · {t("ui.room")} {reservation.roomId?.replace("hr_", "") || "n/d"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0 md:w-44">
                      <label className={LABEL}>{t("cassa.roomCharge.service")}</label>
                      <select
                        className={INPUT}
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value as typeof serviceType)}
                      >
                        <option value="breakfast">{t("cassa.service.breakfast")}</option>
                        <option value="lunch">{t("cassa.service.lunch")}</option>
                        <option value="dinner">{t("cassa.service.dinner")}</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      className={BTN_OUTLINE}
                      disabled={!reservationId}
                      onClick={() => {
                        handleRoomCharge().catch((err) => {
                          console.error("Failed to charge room:", err);
                          doFlash(t("cassa.roomCharge.error"));
                        });
                      }}
                    >
                      <CreditCard className="h-4 w-4" /> {t("cassa.roomCharge.btn")}
                    </button>
                  </div>
                </div>
              ) : null}
              <button type="button" className={BTN_OUTLINE} onClick={() => doFlash(t("cassa.simulateClose.flash"))}>
                <CreditCard className="h-4 w-4" /> {t("cassa.simulateClose")}
              </button>
              <button type="button" className={BTN_OUTLINE} onClick={() => doFlash(t("cassa.printBill.flash"))}>
                <Printer className="h-4 w-4" /> {t("cassa.printBill")}
              </button>
              {/* Pagamento online QR */}
              <PayOnlineButton total={total} tableLabel={selected?.table ?? ""} />
              <button
                type="button"
                className={BTN_PRIMARY}
                onClick={() => {
                  for (const o of tableOrders) {
                    onCloseTable(o.id);
                  }
                  setSelectedTable(null);
                  doFlash(t("cassa.closeTable.flash"));
                }}
              >
                <Banknote className="h-4 w-4" /> {t("cassa.closeTable")}
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  Tab: Menù ufficiale                                                */
/* ================================================================== */

function MenuTab({ menuItems, setMenuItems }: { menuItems: ApiMenuItem[]; setMenuItems: React.Dispatch<React.SetStateAction<ApiMenuItem[]>> }) {
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <Card title={t("cassa.menu.newDish")} description={t("cassa.menu.newDishDesc")}>
        <div className="space-y-3">
          <div>
            <label className={LABEL}>{t("cassa.menu.dishName")}</label>
            <input className={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="es. Spaghetti allo scoglio" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>{t("cassa.menu.category")}</label>
              <input className={INPUT} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Primi, Secondi…" />
            </div>
            <div>
              <label className={LABEL}>{t("cassa.menu.area")}</label>
              <select className={INPUT} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                <option value="cucina">{t("cassa.area.cucina")}</option>
                <option value="pizzeria">{t("cassa.area.pizzeria")}</option>
                <option value="bar">{t("cassa.area.bar")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>{t("cassa.menu.price")}</label>
            <input type="number" min="0" step="0.50" className={INPUT} value={form.price || ""} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
          </div>
          <div>
            <label className={LABEL}>{t("ui.notes")}</label>
            <textarea className={cn(INPUT, "resize-y")} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Allergeni, varianti…" />
          </div>
          <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={addItem}>
            <Plus className="h-4 w-4" /> {t("cassa.menu.addDish")}
          </button>
        </div>
      </Card>

      <Card
        title={t("cassa.menu.inMenu")}
        description={`${filtered.length} ${t("ui.dishesFound")}`}
        headerRight={
          <div className="relative w-52">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
            <input className={cn(INPUT, "pl-9")} placeholder={t("ui.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        }
      >
        <DataTable
          columns={[
            { key: "name", header: t("ui.name") },
            { key: "category", header: t("cassa.menu.category") },
            { key: "area", header: t("cassa.menu.area") },
            { key: "price", header: t("cassa.col.price"), render: (r: ApiMenuItem) => `€ ${r.price.toFixed(2)}` },
            {
              key: "active",
              header: t("ui.status"),
              render: (r: ApiMenuItem) => (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", r.active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")}>
                  {r.active ? t("ui.active") : t("ui.inactive")}
                </span>
              ),
            },
            {
              key: "id",
              header: "",
              render: (r: ApiMenuItem) => (
                <button type="button" onClick={() => removeItem(r.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              ),
            },
          ]}
          data={filtered}
          keyExtractor={(r) => r.id}
          emptyMessage={t("cassa.menu.notFound")}
        />
      </Card>
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="space-y-6">
        <Card title={t("cassa.report.dailyClose")} description={t("cassa.report.fillDesc")}>
          <div className="space-y-3">
            <div>
              <label className={LABEL}>{t("ui.date")}</label>
              <input type="date" className={INPUT} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL}>{t("cassa.report.foodSpend")}</label>
                <input type="number" min="0" step="1" className={INPUT} value={form.foodSpend} onChange={(e) => setForm({ ...form, foodSpend: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className={LABEL}>{t("cassa.report.staffSpend")}</label>
                <input type="number" min="0" step="1" className={INPUT} value={form.staffSpend} onChange={(e) => setForm({ ...form, staffSpend: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div>
              <label className={LABEL}>{t("ui.notes")}</label>
              <textarea className={cn(INPUT, "resize-y")} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Osservazioni…" />
            </div>
            <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3">
              <p className="text-xs text-rw-muted">{t("cassa.report.autoRevenue")}</p>
              <p className="font-display text-xl font-semibold text-rw-ink">€ {todayRevenue.toFixed(2)}</p>
            </div>
            <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={saveReport}>
              <Save className="h-4 w-4" /> {t("cassa.report.save")}
            </button>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title={selectedReport ? `${t("cassa.report.detail")} — ${selectedReport.date}` : t("cassa.report.detail")}>
          {!selectedReport ? (
            <div className="flex flex-col items-center gap-2 py-10 text-rw-muted">
              <FileText className="h-10 w-10 opacity-40" />
              <p className="text-sm">{t("cassa.report.selectFromHistory")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3">
                  <p className="text-xs text-rw-muted">{t("cassa.report.foodSpend")}</p>
                  <p className="font-display text-lg font-semibold text-rw-ink">€ {selectedReport.foodSpend.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3">
                  <p className="text-xs text-rw-muted">{t("cassa.report.staffSpend")}</p>
                  <p className="font-display text-lg font-semibold text-rw-ink">€ {selectedReport.staffSpend.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                  <p className="text-xs text-emerald-400">{t("cassa.report.revenue")}</p>
                  <p className="font-display text-lg font-semibold text-emerald-300">€ {selectedReport.revenue.toFixed(2)}</p>
                </div>
              </div>
              <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3">
                <p className="text-xs text-rw-muted">{t("cassa.report.estimatedMargin")}</p>
                <p className="font-display text-xl font-semibold text-rw-ink">
                  € {(selectedReport.revenue - selectedReport.foodSpend - selectedReport.staffSpend).toFixed(2)}
                </p>
              </div>
              {selectedReport.notes && (
                <p className="text-sm text-rw-soft">{selectedReport.notes}</p>
              )}
            </div>
          )}
        </Card>

        <Card title={t("cassa.report.history")}>
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
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                      selectedReport?.id === r.id
                        ? "border-rw-accent bg-rw-accent/10 text-rw-ink"
                        : "border-rw-line bg-rw-surfaceAlt text-rw-soft hover:border-rw-accent/25",
                    )}
                  >
                    <div>
                      <span className="font-semibold text-rw-ink">{r.date}</span>
                      {r.notes && <span className="ml-2 text-xs text-rw-muted">— {r.notes}</span>}
                    </div>
                    <span className="text-sm font-semibold text-emerald-400">€ {r.revenue.toFixed(2)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
