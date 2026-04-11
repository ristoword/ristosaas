"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeEuro,
  BarChart3,
  Box,
  CalendarDays,
  ChefHat,
  ClipboardList,
  DollarSign,
  FileText,
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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OrdineStorico = {
  id: string;
  dataOra: string;
  tavolo: string;
  area: string;
  stato: "completato" | "in corso" | "annullato";
  coperti: number;
  cameriere: string;
  totale: number;
};

type Storno = {
  id: string;
  dataOra: string;
  importo: number;
  motivo: string;
  tavolo: string;
  ordineId: string;
  note: string;
};

type MenuItem = {
  id: string;
  nome: string;
  categoria: string;
  prezzo: number;
  disponibile: boolean;
};

type InventoryItem = {
  id: string;
  nome: string;
  categoria: string;
  qtDisponibile: number;
  unita: string;
  sottoSoglia: boolean;
};

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const mockOrdini: OrdineStorico[] = [
  { id: "o1", dataOra: "2026-04-11 12:15", tavolo: "T1", area: "Sala", stato: "completato", coperti: 4, cameriere: "Marco B.", totale: 128.5 },
  { id: "o2", dataOra: "2026-04-11 12:30", tavolo: "T5", area: "Terrazza", stato: "in corso", coperti: 2, cameriere: "Elena C.", totale: 45.0 },
  { id: "o3", dataOra: "2026-04-11 13:00", tavolo: "T3", area: "Sala", stato: "completato", coperti: 6, cameriere: "Marco B.", totale: 210.0 },
  { id: "o4", dataOra: "2026-04-11 13:15", tavolo: "T8", area: "Privé", stato: "in corso", coperti: 8, cameriere: "Sara M.", totale: 320.0 },
  { id: "o5", dataOra: "2026-04-11 13:45", tavolo: "T2", area: "Sala", stato: "annullato", coperti: 2, cameriere: "Elena C.", totale: 0 },
  { id: "o6", dataOra: "2026-04-10 20:00", tavolo: "T6", area: "Terrazza", stato: "completato", coperti: 3, cameriere: "Luca V.", totale: 95.0 },
  { id: "o7", dataOra: "2026-04-10 20:30", tavolo: "T1", area: "Sala", stato: "completato", coperti: 5, cameriere: "Marco B.", totale: 175.5 },
  { id: "o8", dataOra: "2026-04-10 21:00", tavolo: "T4", area: "Sala", stato: "completato", coperti: 2, cameriere: "Sara M.", totale: 62.0 },
];

const mockStorni: Storno[] = [
  { id: "s1", dataOra: "2026-04-11 12:45", importo: 15.0, motivo: "Piatto errato", tavolo: "T1", ordineId: "o1", note: "Risotto al posto di pasta" },
  { id: "s2", dataOra: "2026-04-11 13:30", importo: 8.5, motivo: "Cliente insoddisfatto", tavolo: "T3", ordineId: "o3", note: "Dessert non gradito" },
  { id: "s3", dataOra: "2026-04-10 21:15", importo: 22.0, motivo: "Errore cameriere", tavolo: "T4", ordineId: "o8", note: "Doppio addebito vino" },
];

const mockMenu: MenuItem[] = [
  { id: "m1", nome: "Spaghetti alla carbonara", categoria: "Primi", prezzo: 14.0, disponibile: true },
  { id: "m2", nome: "Risotto ai funghi porcini", categoria: "Primi", prezzo: 16.0, disponibile: true },
  { id: "m3", nome: "Tagliata di manzo", categoria: "Secondi", prezzo: 22.0, disponibile: true },
  { id: "m4", nome: "Branzino al forno", categoria: "Secondi", prezzo: 20.0, disponibile: false },
  { id: "m5", nome: "Tiramisù", categoria: "Dolci", prezzo: 8.0, disponibile: true },
  { id: "m6", nome: "Panna cotta", categoria: "Dolci", prezzo: 7.0, disponibile: true },
  { id: "m7", nome: "Bruschetta mista", categoria: "Antipasti", prezzo: 10.0, disponibile: true },
  { id: "m8", nome: "Carpaccio di tonno", categoria: "Antipasti", prezzo: 14.0, disponibile: false },
];

const mockInventory: InventoryItem[] = [
  { id: "i1", nome: "Farina 00", categoria: "Secchi", qtDisponibile: 25, unita: "kg", sottoSoglia: false },
  { id: "i2", nome: "Olio EVO", categoria: "Condimenti", qtDisponibile: 8, unita: "L", sottoSoglia: false },
  { id: "i3", nome: "Pomodori San Marzano", categoria: "Freschi", qtDisponibile: 3, unita: "kg", sottoSoglia: true },
  { id: "i4", nome: "Mozzarella di bufala", categoria: "Freschi", qtDisponibile: 2, unita: "kg", sottoSoglia: true },
  { id: "i5", nome: "Vino Chianti", categoria: "Bevande", qtDisponibile: 18, unita: "bottiglie", sottoSoglia: false },
  { id: "i6", nome: "Birra artigianale", categoria: "Bevande", qtDisponibile: 4, unita: "casse", sottoSoglia: true },
];

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
  const [storicoDate, setStoricoDate] = useState("2026-04-11");
  const [storicoFilter, setStoricoFilter] = useState("");
  const [menuFilter, setMenuFilter] = useState("");
  const [menuCatFilter, setMenuCatFilter] = useState("tutti");
  const [storni, setStorni] = useState<Storno[]>(mockStorni);

  // storno form
  const [sImporto, setSImporto] = useState("");
  const [sMotivo, setSMotivo] = useState("");
  const [sTavolo, setSTavolo] = useState("");
  const [sOrdineId, setSOrdineId] = useState("");
  const [sNote, setSNote] = useState("");

  /* ---- derived KPIs ---- */
  const incassoLordo = mockOrdini.filter((o) => o.stato === "completato").reduce((s, o) => s + o.totale, 0);
  const totaleStorni = storni.reduce((s, st) => s + st.importo, 0);
  const incassoNetto = incassoLordo - totaleStorni;

  const copertiTotali = mockOrdini.filter((o) => o.stato !== "annullato").reduce((s, o) => s + o.coperti, 0);
  const scontrinoMedio = mockOrdini.filter((o) => o.stato === "completato").length > 0
    ? incassoLordo / mockOrdini.filter((o) => o.stato === "completato").length
    : 0;
  const ordiniAttivi = mockOrdini.filter((o) => o.stato === "in corso").length;

  const menuCategorie = ["tutti", ...Array.from(new Set(mockMenu.map((m) => m.categoria)))];

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
    { key: "dataOra", header: "Data/Ora", render: (r: OrdineStorico) => <span className="whitespace-nowrap text-rw-ink">{r.dataOra}</span> },
    { key: "tavolo", header: "Tavolo" },
    { key: "area", header: "Area" },
    {
      key: "stato", header: "Stato",
      render: (r: OrdineStorico) => {
        const t = { completato: "bg-emerald-500/15 text-emerald-400", "in corso": "bg-amber-500/15 text-amber-400", annullato: "bg-red-500/15 text-red-400" } as const;
        return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", t[r.stato])}>{r.stato}</span>;
      },
    },
    { key: "coperti", header: "Coperti" },
    { key: "cameriere", header: "Cameriere" },
    { key: "totale", header: "Totale", render: (r: OrdineStorico) => <span className="font-semibold text-rw-ink">€{r.totale.toFixed(2)}</span> },
  ];

  const storniColonne = [
    { key: "dataOra", header: "Data/Ora", render: (r: Storno) => <span className="whitespace-nowrap">{r.dataOra}</span> },
    { key: "importo", header: "Importo", render: (r: Storno) => <span className="font-semibold text-red-400">€{r.importo.toFixed(2)}</span> },
    { key: "motivo", header: "Motivo" },
    { key: "tavolo", header: "Tavolo" },
    { key: "ordineId", header: "Ordine" },
    { key: "note", header: "Note" },
  ];

  const menuColonne = [
    { key: "nome", header: "Piatto", render: (r: MenuItem) => <span className="font-medium text-rw-ink">{r.nome}</span> },
    { key: "categoria", header: "Categoria" },
    { key: "prezzo", header: "Prezzo", render: (r: MenuItem) => <span>€{r.prezzo.toFixed(2)}</span> },
    {
      key: "disponibile", header: "Stato",
      render: (r: MenuItem) => (
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", r.disponibile ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")}>
          {r.disponibile ? "Disponibile" : "Esaurito"}
        </span>
      ),
    },
  ];

  const inventoryColonne = [
    { key: "nome", header: "Prodotto", render: (r: InventoryItem) => <span className="font-medium text-rw-ink">{r.nome}</span> },
    { key: "categoria", header: "Categoria" },
    { key: "qt", header: "Disponibile", render: (r: InventoryItem) => `${r.qtDisponibile} ${r.unita}` },
    {
      key: "soglia", header: "Stato",
      render: (r: InventoryItem) => (
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", r.sottoSoglia ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400")}>
          {r.sottoSoglia ? "Sotto soglia" : "OK"}
        </span>
      ),
    },
  ];

  /* ---- filtered data ---- */
  const filteredStorico = mockOrdini.filter((o) => {
    if (storicoFilter && !o.cameriere.toLowerCase().includes(storicoFilter.toLowerCase()) && !o.tavolo.toLowerCase().includes(storicoFilter.toLowerCase())) return false;
    return true;
  });

  const filteredMenu = mockMenu.filter((m) => {
    if (menuCatFilter !== "tutti" && m.categoria !== menuCatFilter) return false;
    if (menuFilter && !m.nome.toLowerCase().includes(menuFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header + KPIs */}
      <PageHeader title="Supervisor" subtitle="Controllo economico e operativo del ristorante">
        <Chip label="Data" value="11/04/2026" />
        <Chip label="Incasso lordo" value={`€${incassoLordo.toFixed(2)}`} tone="success" />
        <Chip label="Storni" value={`€${totaleStorni.toFixed(2)}`} tone={totaleStorni > 0 ? "danger" : "default"} />
        <Chip label="Incasso netto" value={`€${incassoNetto.toFixed(2)}`} tone="accent" />
      </PageHeader>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* ============================================================ */}
      {/*  TAB: Report                                                  */}
      {/* ============================================================ */}
      {tab === "report" && (
        <div className="space-y-6">
          {/* KPI grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={BadgeEuro} label="Incasso lordo" value={`€${incassoLordo.toFixed(2)}`} trend="up" sub="Totale ordini completati" />
            <MetricCard icon={XCircle} label="Storni" value={`€${totaleStorni.toFixed(2)}`} trend={totaleStorni > 0 ? "down" : "neutral"} sub={`${storni.length} operazioni`} />
            <MetricCard icon={DollarSign} label="Incasso netto" value={`€${incassoNetto.toFixed(2)}`} trend="up" sub="Lordo − storni" />
            <MetricCard icon={TrendingUp} label="Scontrino medio" value={`€${scontrinoMedio.toFixed(2)}`} trend="up" sub="Per ordine completato" />
            <MetricCard icon={Users} label="Coperti totali" value={String(copertiTotali)} sub="Oggi (esclusi annullati)" />
            <MetricCard icon={ShoppingCart} label="Ordini attivi" value={String(ordiniAttivi)} tone="accent" sub="In corso adesso" />
            <MetricCard icon={ClipboardList} label="Ordini completati" value={String(mockOrdini.filter((o) => o.stato === "completato").length)} sub="Chiusi oggi" />
            <MetricCard icon={UtensilsCrossed} label="Piatti disponibili" value={String(mockMenu.filter((m) => m.disponibile).length)} sub={`su ${mockMenu.length} totali`} />
          </div>

          {/* Staff summary + live */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Riepilogo staff" description="Presenze e performance odierne">
              <ul className="space-y-2">
                {[
                  { l: "Presenti oggi", v: "5 / 8" },
                  { l: "Ore totali lavorate", v: "25.5 h" },
                  { l: "Turni ancora aperti", v: "2" },
                  { l: "Richieste assenza in attesa", v: "1" },
                ].map((r) => (
                  <li key={r.l} className="flex items-center justify-between rounded-xl bg-rw-surfaceAlt px-3 py-2">
                    <span className="text-sm text-rw-soft">{r.l}</span>
                    <span className="font-semibold text-rw-ink">{r.v}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Incasso live" description="Metriche aggiornate in tempo reale">
              <ul className="space-y-2">
                {[
                  { l: "Ultimo ordine", v: "13:45 — T2" },
                  { l: "Incasso ultima ora", v: "€365.00" },
                  { l: "Media coperti/tavolo", v: "3.8" },
                  { l: "Tasso storni", v: `${((totaleStorni / (incassoLordo || 1)) * 100).toFixed(1)}%` },
                ].map((r) => (
                  <li key={r.l} className="flex items-center justify-between rounded-xl bg-rw-surfaceAlt px-3 py-2">
                    <span className="text-sm text-rw-soft">{r.l}</span>
                    <span className="font-semibold text-rw-ink">{r.v}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Storico report list */}
          <Card title="Storico report" description="Ultimi report generati">
            <ul className="space-y-2">
              {[
                { data: "11/04/2026", tipo: "Giornaliero", totale: `€${incassoNetto.toFixed(2)}` },
                { data: "10/04/2026", tipo: "Giornaliero", totale: "€332.50" },
                { data: "W14 2026", tipo: "Settimanale", totale: "€2,845.00" },
              ].map((r) => (
                <li key={r.data} className="flex items-center justify-between rounded-xl bg-rw-surfaceAlt px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-rw-accent" />
                    <div>
                      <p className="text-sm font-medium text-rw-ink">{r.tipo}</p>
                      <p className="text-xs text-rw-muted">{r.data}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-rw-ink">{r.totale}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Active orders */}
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
              data={mockOrdini.filter((o) => o.stato === "in corso")}
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
            <input type="date" className={cn(inputCls, "w-auto")} value={storicoDate} onChange={(e) => setStoricoDate(e.target.value)} />
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
          {/* Storno form */}
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

          {/* Storni list */}
          <Card title="Elenco storni" description={`${storni.length} storni registrati`}>
            <DataTable columns={storniColonne} data={storni} keyExtractor={(r) => r.id} emptyMessage="Nessuno storno registrato" />
          </Card>

          {/* Totals */}
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

          {/* Daily menu card */}
          <Card title="Menu del giorno" description="11 aprile 2026">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { portata: "Antipasto", piatto: "Bruschetta mista", prezzo: "€10.00" },
                { portata: "Primo", piatto: "Risotto ai funghi porcini", prezzo: "€16.00" },
                { portata: "Secondo", piatto: "Tagliata di manzo", prezzo: "€22.00" },
                { portata: "Dolce", piatto: "Tiramisù", prezzo: "€8.00" },
              ].map((d) => (
                <div key={d.portata} className="flex items-center justify-between rounded-xl bg-rw-surfaceAlt px-3 py-2.5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">{d.portata}</p>
                    <p className="text-sm font-medium text-rw-ink">{d.piatto}</p>
                  </div>
                  <span className="font-semibold text-rw-accent">{d.prezzo}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/*  TAB: Magazzino                                               */}
      {/* ============================================================ */}
      {tab === "magazzino" && (
        <div className="space-y-6">
          {/* Inventory KPIs */}
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard icon={Package} label="Prodotti totali" value={String(mockInventory.length)} sub="In magazzino" />
            <MetricCard icon={Box} label="Sotto soglia" value={String(mockInventory.filter((i) => i.sottoSoglia).length)} trend={mockInventory.some((i) => i.sottoSoglia) ? "down" : "neutral"} sub="Da riordinare" />
            <MetricCard icon={ChefHat} label="Categorie" value={String(new Set(mockInventory.map((i) => i.categoria)).size)} sub="Gruppi di prodotti" />
          </div>

          <Card
            title="Inventario"
            description={`${mockInventory.length} prodotti`}
            headerRight={
              <button type="button" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rw-accent hover:bg-rw-accent/10">
                <RefreshCw className="h-3.5 w-3.5" /> Aggiorna
              </button>
            }
          >
            <DataTable columns={inventoryColonne} data={mockInventory} keyExtractor={(r) => r.id} emptyMessage="Magazzino vuoto" />
          </Card>
        </div>
      )}
    </div>
  );
}
