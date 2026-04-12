"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeEuro,
  BarChart3,
  Box,
  ChefHat,
  ClipboardList,
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
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { Card } from "@/components/shared/card";
import { TabBar } from "@/components/shared/tab-bar";
import { DataTable } from "@/components/shared/data-table";
import { AiChat, AiToggleButton } from "@/components/ai/ai-chat";
import {
  ordersApi,
  menuApi,
  warehouseApi,
  staffApi,
  archivioApi,
  type Order,
  type MenuItem as ApiMenuItem,
  type StockItem,
  type StaffMember,
  type ArchivedOrder,
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

const TABS = [
  { id: "report", label: "Report" },
  { id: "storico", label: "Storico" },
  { id: "storni", label: "Storni" },
  { id: "menu", label: "Menù" },
  { id: "magazzino", label: "Magazzino" },
];

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
  const [tab, setTab] = useState("report");
  const [aiOpen, setAiOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
  const [totalStockValue, setTotalStockValue] = useState(0);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [archivedOrders, setArchivedOrders] = useState<ArchivedOrder[]>([]);

  const [storicoFilter, setStoricoFilter] = useState("");
  const [menuFilter, setMenuFilter] = useState("");
  const [menuCatFilter, setMenuCatFilter] = useState("tutti");
  const [storni, setStorni] = useState<Storno[]>([]);

  const [sImporto, setSImporto] = useState("");
  const [sMotivo, setSMotivo] = useState("");
  const [sTavolo, setSTavolo] = useState("");
  const [sOrdineId, setSOrdineId] = useState("");
  const [sNote, setSNote] = useState("");

  useEffect(() => {
    Promise.all([
      ordersApi.list(),
      menuApi.listItems(),
      warehouseApi.list(),
      staffApi.list(),
      archivioApi.list(),
    ])
      .then(([ordersData, menuData, warehouseData, staffData, archivioData]) => {
        setOrders(ordersData);
        setMenuItems(menuData);
        setStockItems(warehouseData.items);
        setLowStockItems(warehouseData.lowStock);
        setTotalStockValue(warehouseData.totalValue);
        setStaffMembers(staffData);
        setArchivedOrders(archivioData);
      })
      .catch((err) => console.error("Failed to fetch supervisor data:", err))
      .finally(() => setLoading(false));
  }, []);

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

  const menuCategorie = useMemo(
    () => ["tutti", ...Array.from(new Set(menuItems.map((m) => m.category)))],
    [menuItems],
  );

  /* ---- handlers ---- */
  function handleAddStorno() {
    if (!sImporto || !sMotivo.trim()) return;
    const id = `s${Date.now()}`;
    setStorni((p) => [
      ...p,
      {
        id,
        dataOra: new Date().toISOString().replace("T", " ").slice(0, 16),
        importo: parseFloat(sImporto),
        motivo: sMotivo.trim(),
        tavolo: sTavolo,
        ordineId: sOrdineId,
        note: sNote,
      },
    ]);
    setSImporto(""); setSMotivo(""); setSTavolo(""); setSOrdineId(""); setSNote("");
  }

  /* ---- table columns ---- */
  const storicoColonne = [
    { key: "createdAt" as const, header: "Data/Ora", render: (r: Order) => <span className="whitespace-nowrap text-rw-ink">{r.createdAt}</span> },
    { key: "table" as const, header: "Tavolo", render: (r: Order) => r.table ?? "—" },
    { key: "area" as const, header: "Area" },
    {
      key: "status" as const, header: "Stato",
      render: (r: Order) => {
        const t: Record<string, string> = { chiuso: "bg-emerald-500/15 text-emerald-400", servito: "bg-emerald-500/15 text-emerald-400", in_attesa: "bg-amber-500/15 text-amber-400", in_preparazione: "bg-amber-500/15 text-amber-400", pronto: "bg-blue-500/15 text-blue-400", annullato: "bg-red-500/15 text-red-400" };
        return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", t[r.status] ?? "")}>{r.status.replace("_", " ")}</span>;
      },
    },
    { key: "covers" as const, header: "Coperti", render: (r: Order) => r.covers ?? "—" },
    { key: "waiter" as const, header: "Cameriere" },
    { key: "id" as const, header: "Totale", render: (r: Order) => <span className="font-semibold text-rw-ink">€{r.items.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0).toFixed(2)}</span> },
  ];

  const storniColonne = [
    { key: "dataOra" as const, header: "Data/Ora", render: (r: Storno) => <span className="whitespace-nowrap">{r.dataOra}</span> },
    { key: "importo" as const, header: "Importo", render: (r: Storno) => <span className="font-semibold text-red-400">€{r.importo.toFixed(2)}</span> },
    { key: "motivo" as const, header: "Motivo" },
    { key: "tavolo" as const, header: "Tavolo" },
    { key: "ordineId" as const, header: "Ordine" },
    { key: "note" as const, header: "Note" },
  ];

  const menuColonne = [
    { key: "name" as const, header: "Piatto", render: (r: ApiMenuItem) => <span className="font-medium text-rw-ink">{r.name}</span> },
    { key: "category" as const, header: "Categoria" },
    { key: "price" as const, header: "Prezzo", render: (r: ApiMenuItem) => <span>€{r.price.toFixed(2)}</span> },
    {
      key: "active" as const, header: "Stato",
      render: (r: ApiMenuItem) => (
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", r.active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")}>
          {r.active ? "Disponibile" : "Esaurito"}
        </span>
      ),
    },
  ];

  const inventoryColonne = [
    { key: "name" as const, header: "Prodotto", render: (r: StockItem) => <span className="font-medium text-rw-ink">{r.name}</span> },
    { key: "category" as const, header: "Categoria" },
    { key: "qty" as const, header: "Disponibile", render: (r: StockItem) => `${r.qty} ${r.unit}` },
    {
      key: "minStock" as const, header: "Stato",
      render: (r: StockItem) => {
        const isLow = r.qty <= r.minStock;
        return (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", isLow ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400")}>
            {isLow ? "Sotto soglia" : "OK"}
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
      <PageHeader title="Supervisor" subtitle="Controllo economico e operativo del ristorante">
        <Chip label="Incasso lordo" value={`€${incassoLordo.toFixed(2)}`} tone="success" />
        <Chip label="Storni" value={`€${totaleStorni.toFixed(2)}`} tone={totaleStorni > 0 ? "danger" : "default"} />
        <Chip label="Incasso netto" value={`€${incassoNetto.toFixed(2)}`} tone="accent" />
        <Chip label="Valore magazzino" value={`€${totalStockValue.toFixed(2)}`} />
        <Chip label="Sotto scorta" value={lowStockItems.length} tone={lowStockItems.length > 0 ? "danger" : "default"} />
        <AiToggleButton onClick={() => setAiOpen(true)} label="AI Supervisor" />
      </PageHeader>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* ============================================================ */}
      {/*  TAB: Report                                                  */}
      {/* ============================================================ */}
      {tab === "report" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={BadgeEuro} label="Incasso lordo" value={`€${incassoLordo.toFixed(2)}`} trend="up" sub="Totale ordini completati" />
            <MetricCard icon={XCircle} label="Storni" value={`€${totaleStorni.toFixed(2)}`} trend={totaleStorni > 0 ? "down" : "neutral"} sub={`${storni.length} operazioni`} />
            <MetricCard icon={DollarSign} label="Incasso netto" value={`€${incassoNetto.toFixed(2)}`} trend="up" sub="Lordo − storni" />
            <MetricCard icon={TrendingUp} label="Scontrino medio" value={`€${scontrinoMedio.toFixed(2)}`} trend="up" sub="Per ordine completato" />
            <MetricCard icon={Users} label="Staff attivo" value={String(activeStaff.length)} sub={`su ${staffMembers.length} totali`} />
            <MetricCard icon={ShoppingCart} label="Ordini attivi" value={String(ordiniAttivi)} tone="accent" sub="In corso adesso" />
            <MetricCard icon={ClipboardList} label="Ordini archiviati" value={String(archivedOrders.length)} sub="Totale in archivio" />
            <MetricCard icon={UtensilsCrossed} label="Piatti attivi" value={String(menuItems.filter((m) => m.active).length)} sub={`su ${menuItems.length} totali`} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Riepilogo staff" description="Personale e ruoli">
              <ul className="space-y-2">
                {[
                  { l: "Staff attivo", v: `${activeStaff.length} / ${staffMembers.length}` },
                  { l: "In ferie", v: String(staffMembers.filter((s) => s.status === "ferie").length) },
                  { l: "In malattia", v: String(staffMembers.filter((s) => s.status === "malattia").length) },
                  { l: "Valore magazzino", v: `€${totalStockValue.toFixed(2)}` },
                ].map((r) => (
                  <li key={r.l} className="flex items-center justify-between rounded-xl bg-rw-surfaceAlt px-3 py-2">
                    <span className="text-sm text-rw-soft">{r.l}</span>
                    <span className="font-semibold text-rw-ink">{r.v}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Riepilogo magazzino" description="Stato scorte e valori">
              <ul className="space-y-2">
                {[
                  { l: "Prodotti totali", v: String(stockItems.length) },
                  { l: "Sotto soglia", v: String(lowStockItems.length) },
                  { l: "Valore totale", v: `€${totalStockValue.toFixed(2)}` },
                  { l: "Categorie", v: String(new Set(stockItems.map((s) => s.category)).size) },
                ].map((r) => (
                  <li key={r.l} className="flex items-center justify-between rounded-xl bg-rw-surfaceAlt px-3 py-2">
                    <span className="text-sm text-rw-soft">{r.l}</span>
                    <span className="font-semibold text-rw-ink">{r.v}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card
            title="Dettaglio ordini attivi"
            headerRight={
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rw-muted" />
                <input
                  className={cn(inputCls, "w-48 py-1.5 pl-8 text-xs")}
                  placeholder="Filtra tavolo / cameriere"
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
              emptyMessage="Nessun ordine attivo"
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
              <input className={cn(inputCls, "pl-8")} placeholder="Filtra per cameriere o tavolo…" value={storicoFilter} onChange={(e) => setStoricoFilter(e.target.value)} />
            </div>
          </div>
          <DataTable columns={storicoColonne} data={filteredStorico} keyExtractor={(r) => r.id} emptyMessage="Nessun ordine trovato" />
        </div>
      )}

      {/* ============================================================ */}
      {/*  TAB: Storni                                                  */}
      {/* ============================================================ */}
      {tab === "storni" && (
        <div className="space-y-6">
          <Card title="Nuovo storno" description="Registra un'operazione di storno.">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={labelCls}>Importo (€)</label><input type="number" step="0.01" className={inputCls} value={sImporto} onChange={(e) => setSImporto(e.target.value)} placeholder="0.00" /></div>
              <div><label className={labelCls}>Motivo</label><input className={inputCls} value={sMotivo} onChange={(e) => setSMotivo(e.target.value)} placeholder="Errore, insoddisfazione…" /></div>
              <div><label className={labelCls}>Tavolo</label><input className={inputCls} value={sTavolo} onChange={(e) => setSTavolo(e.target.value)} placeholder="T1" /></div>
              <div><label className={labelCls}>ID Ordine</label><input className={inputCls} value={sOrdineId} onChange={(e) => setSOrdineId(e.target.value)} placeholder="o1" /></div>
              <div className="sm:col-span-2"><label className={labelCls}>Note</label><textarea className={cn(inputCls, "resize-y")} rows={2} value={sNote} onChange={(e) => setSNote(e.target.value)} placeholder="Dettagli…" /></div>
              <div className="sm:col-span-2">
                <button type="button" className={btnPrimary} onClick={handleAddStorno}>
                  <XCircle className="h-4 w-4" /> Registra storno
                </button>
              </div>
            </div>
          </Card>

          <Card title="Elenco storni" description={`${storni.length} storni registrati`}>
            <DataTable columns={storniColonne} data={storni} keyExtractor={(r) => r.id} emptyMessage="Nessuno storno registrato" />
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard icon={XCircle} label="Totale storni" value={`€${totaleStorni.toFixed(2)}`} trend="down" />
            <MetricCard icon={BarChart3} label="N° storni" value={String(storni.length)} />
            <MetricCard icon={DollarSign} label="Media storno" value={`€${storni.length ? (totaleStorni / storni.length).toFixed(2) : "0.00"}`} />
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
              <input className={cn(inputCls, "pl-8")} placeholder="Cerca piatto…" value={menuFilter} onChange={(e) => setMenuFilter(e.target.value)} />
            </div>
          </div>

          <DataTable columns={menuColonne} data={filteredMenu} keyExtractor={(r) => r.id} emptyMessage="Nessun piatto trovato" />
        </div>
      )}

      {/* ============================================================ */}
      {/*  TAB: Magazzino                                               */}
      {/* ============================================================ */}
      {tab === "magazzino" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard icon={Package} label="Prodotti totali" value={String(stockItems.length)} sub="In magazzino" />
            <MetricCard icon={Box} label="Sotto soglia" value={String(lowStockItems.length)} trend={lowStockItems.length > 0 ? "down" : "neutral"} sub="Da riordinare" />
            <MetricCard icon={ChefHat} label="Valore totale" value={`€${totalStockValue.toFixed(2)}`} sub="Valore stock" />
          </div>

          <Card
            title="Inventario"
            description={`${stockItems.length} prodotti`}
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
                <RefreshCw className="h-3.5 w-3.5" /> Aggiorna
              </button>
            }
          >
            <DataTable columns={inventoryColonne} data={stockItems} keyExtractor={(r) => r.id} emptyMessage="Magazzino vuoto" />
          </Card>
        </div>
      )}

      <AiChat context="supervisor" open={aiOpen} onClose={() => setAiOpen(false)} title="AI Supervisor" />
    </div>
  );
}
