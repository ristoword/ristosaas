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
  Receipt,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { TabBar } from "@/components/shared/tab-bar";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { AiChat, AiToggleButton } from "@/components/ai/ai-chat";
import { useHotel } from "@/components/hotel/hotel-context";
import { tenantPlatformProfile } from "@/core/tenant/platform-config";
import {
  ordersApi,
  menuApi,
  type Order,
  type MenuItem as ApiMenuItem,
} from "@/lib/api-client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DailyReport = {
  id: string;
  date: string;
  foodSpend: number;
  staffSpend: number;
  revenue: number;
  notes: string;
};

const TABS = [
  { id: "cassa", label: "Cassa / Tavoli" },
  { id: "menu", label: "Menù ufficiale" },
  { id: "report", label: "Report" },
];

const INPUT =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";

const LABEL = "block text-xs font-semibold text-rw-muted mb-1";

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink transition hover:border-rw-accent/30 active:scale-[0.98]";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CassaPage() {
  const [tab, setTab] = useState("cassa");
  const [aiOpen, setAiOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([]);

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

  return (
    <div className="space-y-6">
      <PageHeader title="Cassa" subtitle="Gestione conti, menù e chiusure">
        <Chip label="Tavoli da chiudere" value={tavoliDaChiudere} tone="warn" />
        <Chip label="Comande servite" value={servedOrders.length} tone="success" />
        <Chip label="Incasso simulato" value={`€ ${incassoSimulato.toFixed(2)}`} tone="accent" />
        <AiToggleButton onClick={() => setAiOpen(true)} label="AI Cassa" />
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

      <AiChat context="cassa" open={aiOpen} onClose={() => setAiOpen(false)} title="AI Cassa" />
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [discount, setDiscount] = useState("");
  const [vatOverride, setVatOverride] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState("");
  const [serviceType, setServiceType] = useState<"breakfast" | "lunch" | "dinner">("dinner");
  const { reservations, roomCharge } = useHotel();
  const roomChargeEnabled =
    tenantPlatformProfile.enabledFeatures.includes("restaurant") &&
    tenantPlatformProfile.enabledFeatures.includes("hotel") &&
    tenantPlatformProfile.enabledFeatures.includes("integration_room_charge");

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

  const selected = servedOrders.find((o) => o.id === selectedId) ?? null;

  const subtotal = selected
    ? selected.items.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0)
    : 0;
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
      <Card title="Tavoli serviti" description="Seleziona un tavolo per generare il conto">
        {grouped.size === 0 && (
          <p className="py-6 text-center text-sm text-rw-muted">Nessun tavolo pronto per il conto</p>
        )}
        <ul className="space-y-2">
          {[...grouped.entries()].map(([table, ords]) => (
            <li key={table}>
              <button
                type="button"
                onClick={() => setSelectedId(ords[0].id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                  selectedId && ords.some((o) => o.id === selectedId)
                    ? "border-rw-accent bg-rw-accent/10 text-rw-ink"
                    : "border-rw-line bg-rw-surfaceAlt text-rw-soft hover:border-rw-accent/25",
                )}
              >
                <span className="font-semibold">{table === "asporto" ? "Asporto" : `Tavolo ${table}`}</span>
                <span className="text-xs text-rw-muted">{ords.length} comanda/e</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title={selected ? `Conto — ${selected.table ? `Tavolo ${selected.table}` : "Asporto"}` : "Dettaglio conto"}
        description={selected ? `Cameriere: ${selected.waiter} · Coperti: ${selected.covers ?? "–"}` : "Seleziona un tavolo a sinistra"}
      >
        {flash && (
          <p className="mb-4 rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-4 py-2.5 text-sm text-rw-ink" role="status">
            {flash}
          </p>
        )}

        {!selected ? (
          <div className="flex flex-col items-center gap-2 py-12 text-rw-muted">
            <Receipt className="h-10 w-10 opacity-40" />
            <p className="text-sm">Nessun tavolo selezionato</p>
          </div>
        ) : (
          <>
            <div className="mb-4 overflow-x-auto rounded-xl border border-rw-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-rw-muted">Piatto</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-rw-muted">Qtà</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-rw-muted">Prezzo</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-rw-muted">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.items.map((item) => (
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
                <label className={LABEL}>Sconto (€)</label>
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
                <label className={LABEL}>IVA (%)</label>
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
                <span>Subtotale</span>
                <span>€ {subtotal.toFixed(2)}</span>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Sconto</span>
                  <span>− € {discountVal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-rw-soft">
                <span>IVA ({vatVal}%)</span>
                <span>€ {(afterDiscount * (vatVal / 100)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-rw-line pt-1 font-display text-lg font-semibold text-rw-ink">
                <span>Totale</span>
                <span>€ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {roomChargeEnabled && selected ? (
                <div className="flex w-full flex-col gap-3 rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
                  <div>
                    <p className="text-sm font-semibold text-rw-ink">Addebita su camera</p>
                    <p className="text-xs text-rw-muted">
                      Sposta il conto sul folio dell’ospite in casa dal layer integration.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="min-w-0 flex-1">
                      <label className={LABEL}>Prenotazione hotel</label>
                      <select
                        className={INPUT}
                        value={reservationId}
                        onChange={(e) => setReservationId(e.target.value)}
                      >
                        <option value="">Seleziona ospite in casa</option>
                        {inHouseReservations.map((reservation) => (
                          <option key={reservation.id} value={reservation.id}>
                            {reservation.guestName} · camera {reservation.roomId?.replace("hr_", "") || "n/d"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0 md:w-44">
                      <label className={LABEL}>Servizio</label>
                      <select
                        className={INPUT}
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value as typeof serviceType)}
                      >
                        <option value="breakfast">Colazione</option>
                        <option value="lunch">Pranzo</option>
                        <option value="dinner">Cena</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      className={BTN_OUTLINE}
                      disabled={!reservationId}
                      onClick={() => {
                        handleRoomCharge().catch((err) => {
                          console.error("Failed to charge room:", err);
                          doFlash("Errore durante l’addebito su camera.");
                        });
                      }}
                    >
                      <CreditCard className="h-4 w-4" /> Addebita su camera
                    </button>
                  </div>
                </div>
              ) : null}
              <button type="button" className={BTN_OUTLINE} onClick={() => doFlash("Chiusura simulata — nessun pagamento reale.")}>
                <CreditCard className="h-4 w-4" /> Simula chiusura
              </button>
              <button type="button" className={BTN_OUTLINE} onClick={() => doFlash("Stampa conto inviata alla stampante virtuale.")}>
                <Printer className="h-4 w-4" /> Stampa conto
              </button>
              <button
                type="button"
                className={BTN_PRIMARY}
                onClick={() => {
                  onCloseTable(selected.id);
                  setSelectedId(null);
                  doFlash("Tavolo chiuso con successo.");
                }}
              >
                <Banknote className="h-4 w-4" /> Chiudi tavolo
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
      <Card title="Nuovo piatto" description="Aggiungi un piatto al menù ufficiale">
        <div className="space-y-3">
          <div>
            <label className={LABEL}>Nome piatto</label>
            <input className={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="es. Spaghetti allo scoglio" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Categoria</label>
              <input className={INPUT} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Primi, Secondi…" />
            </div>
            <div>
              <label className={LABEL}>Area</label>
              <select className={INPUT} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                <option value="cucina">Cucina</option>
                <option value="pizzeria">Pizzeria</option>
                <option value="bar">Bar</option>
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>Prezzo (€)</label>
            <input type="number" min="0" step="0.50" className={INPUT} value={form.price || ""} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
          </div>
          <div>
            <label className={LABEL}>Note</label>
            <textarea className={cn(INPUT, "resize-y")} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Allergeni, varianti…" />
          </div>
          <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={addItem}>
            <Plus className="h-4 w-4" /> Aggiungi piatto
          </button>
        </div>
      </Card>

      <Card
        title="Piatti in menù"
        description={`${filtered.length} piatti trovati`}
        headerRight={
          <div className="relative w-52">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
            <input className={cn(INPUT, "pl-9")} placeholder="Cerca…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        }
      >
        <DataTable
          columns={[
            { key: "name", header: "Nome" },
            { key: "category", header: "Categoria" },
            { key: "area", header: "Area" },
            { key: "price", header: "Prezzo", render: (r: ApiMenuItem) => `€ ${r.price.toFixed(2)}` },
            {
              key: "active",
              header: "Stato",
              render: (r: ApiMenuItem) => (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", r.active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")}>
                  {r.active ? "Attivo" : "Disattivo"}
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
          emptyMessage="Nessun piatto trovato"
        />
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  Tab: Report                                                        */
/* ================================================================== */

function ReportTab({ orders }: { orders: Order[] }) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [form, setForm] = useState({ date: "", foodSpend: "", staffSpend: "", notes: "" });
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);

  const todayRevenue = useMemo(
    () =>
      orders
        .filter((o) => o.status === "chiuso" || o.status === "servito")
        .reduce((s, o) => s + o.items.reduce((a, i) => a + (i.price ?? 0) * i.qty, 0), 0),
    [orders],
  );

  function saveReport() {
    if (!form.date) return;
    const nr: DailyReport = {
      id: `r-${Date.now()}`,
      date: form.date,
      foodSpend: parseFloat(form.foodSpend) || 0,
      staffSpend: parseFloat(form.staffSpend) || 0,
      revenue: todayRevenue,
      notes: form.notes,
    };
    setReports((prev) => [nr, ...prev]);
    setForm({ date: "", foodSpend: "", staffSpend: "", notes: "" });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="space-y-6">
        <Card title="Chiusura giornaliera" description="Compila i dati e salva il report">
          <div className="space-y-3">
            <div>
              <label className={LABEL}>Data</label>
              <input type="date" className={INPUT} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Spesa food (€)</label>
                <input type="number" min="0" step="1" className={INPUT} value={form.foodSpend} onChange={(e) => setForm({ ...form, foodSpend: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className={LABEL}>Spesa personale (€)</label>
                <input type="number" min="0" step="1" className={INPUT} value={form.staffSpend} onChange={(e) => setForm({ ...form, staffSpend: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div>
              <label className={LABEL}>Note</label>
              <textarea className={cn(INPUT, "resize-y")} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Osservazioni…" />
            </div>
            <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3">
              <p className="text-xs text-rw-muted">Incasso automatico (da ordini chiusi/serviti)</p>
              <p className="font-display text-xl font-semibold text-rw-ink">€ {todayRevenue.toFixed(2)}</p>
            </div>
            <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={saveReport}>
              <Save className="h-4 w-4" /> Salva report
            </button>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title={selectedReport ? `Report del ${selectedReport.date}` : "Dettaglio report"}>
          {!selectedReport ? (
            <div className="flex flex-col items-center gap-2 py-10 text-rw-muted">
              <FileText className="h-10 w-10 opacity-40" />
              <p className="text-sm">Seleziona un report dallo storico</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3">
                  <p className="text-xs text-rw-muted">Spesa food</p>
                  <p className="font-display text-lg font-semibold text-rw-ink">€ {selectedReport.foodSpend.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3">
                  <p className="text-xs text-rw-muted">Spesa personale</p>
                  <p className="font-display text-lg font-semibold text-rw-ink">€ {selectedReport.staffSpend.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                  <p className="text-xs text-emerald-400">Incasso</p>
                  <p className="font-display text-lg font-semibold text-emerald-300">€ {selectedReport.revenue.toFixed(2)}</p>
                </div>
              </div>
              <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3">
                <p className="text-xs text-rw-muted">Margine stimato</p>
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

        <Card title="Storico report">
          {reports.length === 0 ? (
            <p className="py-6 text-center text-sm text-rw-muted">Nessun report salvato</p>
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
