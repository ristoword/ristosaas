"use client";

import { useState, useMemo } from "react";
import {
  Archive,
  ArrowDownUp,
  Box,
  ClipboardCheck,
  Download,
  Package,
  Plus,
  Search,
  Settings2,
  Trash2,
  Truck,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { TabBar } from "@/components/shared/tab-bar";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";

/* ------------------------------------------------------------------ */
/*  Types & mock data                                                  */
/* ------------------------------------------------------------------ */

type Product = {
  id: string;
  name: string;
  category: string;
  qty: number;
  unit: string;
  minStock: number;
  cost: number;
  supplier: string;
  notes: string;
};

type ReceivingEntry = {
  id: string;
  product: string;
  qty: number;
  unit: string;
  destination: string;
  operator: string;
  lot: string;
  cost: number;
  supplier: string;
  date: string;
};

type Movement = {
  id: string;
  date: string;
  product: string;
  type: "entrata" | "uscita" | "trasferimento" | "scarico";
  qty: number;
  from: string;
  to: string;
  operator: string;
};

type Equipment = {
  id: string;
  name: string;
  category: string;
  qty: number;
  status: "operativo" | "manutenzione" | "fuori uso";
  location: string;
  value: number;
};

const mockProducts: Product[] = [
  { id: "p1", name: "Farina 00", category: "Secchi", qty: 120, unit: "kg", minStock: 50, cost: 0.85, supplier: "Molino Rossi", notes: "" },
  { id: "p2", name: "Mozzarella di bufala", category: "Latticini", qty: 15, unit: "kg", minStock: 10, cost: 12.5, supplier: "Caseificio Ferrara", notes: "DOP Campana" },
  { id: "p3", name: "Pomodoro San Marzano", category: "Conserve", qty: 80, unit: "kg", minStock: 30, cost: 2.8, supplier: "Ortofrutticola Sud", notes: "Latta da 2.5kg" },
  { id: "p4", name: "Olio EVO Puglia", category: "Condimenti", qty: 45, unit: "L", minStock: 20, cost: 8.9, supplier: "Oleificio Ferrante", notes: "" },
  { id: "p5", name: "Vino Montepulciano", category: "Bevande", qty: 36, unit: "bt", minStock: 12, cost: 4.5, supplier: "Cantina dei Colli", notes: "DOC Abruzzo" },
  { id: "p6", name: "Lievito di birra", category: "Secchi", qty: 8, unit: "kg", minStock: 5, cost: 3.2, supplier: "Molino Rossi", notes: "" },
  { id: "p7", name: "Basilico fresco", category: "Ortofrutta", qty: 4, unit: "kg", minStock: 2, cost: 6.0, supplier: "Ortofrutticola Sud", notes: "Consegna giornaliera" },
];

const mockMovements: Movement[] = [
  { id: "mv1", date: "2026-04-11", product: "Farina 00", type: "entrata", qty: 50, from: "Molino Rossi", to: "Magazzino centrale", operator: "Marco" },
  { id: "mv2", date: "2026-04-11", product: "Mozzarella di bufala", type: "entrata", qty: 10, from: "Caseificio Ferrara", to: "Frigo cucina", operator: "Luca" },
  { id: "mv3", date: "2026-04-10", product: "Farina 00", type: "uscita", qty: 15, from: "Magazzino centrale", to: "Pizzeria", operator: "Marco" },
  { id: "mv4", date: "2026-04-10", product: "Olio EVO Puglia", type: "trasferimento", qty: 5, from: "Magazzino centrale", to: "Cucina", operator: "Giulia" },
  { id: "mv5", date: "2026-04-09", product: "Vino Montepulciano", type: "scarico", qty: 2, from: "Cantina", to: "Sala", operator: "Anna" },
  { id: "mv6", date: "2026-04-09", product: "Pomodoro San Marzano", type: "entrata", qty: 30, from: "Ortofrutticola Sud", to: "Magazzino centrale", operator: "Luca" },
];

const mockEquipment: Equipment[] = [
  { id: "eq1", name: "Forno a legna", category: "Pizzeria", qty: 1, status: "operativo", location: "Pizzeria", value: 8500 },
  { id: "eq2", name: "Abbattitore", category: "Cucina", qty: 1, status: "operativo", location: "Cucina", value: 4200 },
  { id: "eq3", name: "Frigorifero verticale", category: "Cucina", qty: 3, status: "operativo", location: "Cucina", value: 1800 },
  { id: "eq4", name: "Lavastoviglie industriale", category: "Lavaggio", qty: 1, status: "manutenzione", location: "Retro cucina", value: 3200 },
  { id: "eq5", name: "Macchina caffè", category: "Bar", qty: 2, status: "operativo", location: "Bar", value: 5600 },
  { id: "eq6", name: "Impastatrice planetaria", category: "Pizzeria", qty: 1, status: "fuori uso", location: "Pizzeria", value: 2100 },
];

const TABS = [
  { id: "centrale", label: "Centrale" },
  { id: "ricezione", label: "Ricezione" },
  { id: "movimenti", label: "Movimenti" },
  { id: "attrezzature", label: "Attrezzature" },
];

const INPUT =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";

const LABEL = "block text-xs font-semibold text-rw-muted mb-1";

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink transition hover:border-rw-accent/30 active:scale-[0.98]";

const typeColors: Record<Movement["type"], string> = {
  entrata: "text-emerald-400",
  uscita: "text-red-400",
  trasferimento: "text-blue-400",
  scarico: "text-amber-400",
};

const statusColors: Record<Equipment["status"], string> = {
  operativo: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  manutenzione: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  "fuori uso": "border-red-500/30 bg-red-500/10 text-red-400",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MagazzinoPage() {
  const [tab, setTab] = useState("centrale");
  const [products, setProducts] = useState<Product[]>(mockProducts);

  const totalValue = useMemo(
    () => products.reduce((s, p) => s + p.qty * p.cost, 0),
    [products],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Magazzino" subtitle="Scorte, ricezione merce, movimenti e attrezzature">
        <Chip label="Prodotti" value={products.length} tone="info" />
        <Chip label="Valore totale" value={`€ ${totalValue.toFixed(2)}`} tone="accent" />
      </PageHeader>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === "centrale" && <CentraleTab products={products} setProducts={setProducts} />}
      {tab === "ricezione" && <RicezioneTab />}
      {tab === "movimenti" && <MovimentiTab />}
      {tab === "attrezzature" && <AttrezzatureTab />}
    </div>
  );
}

/* ================================================================== */
/*  Tab: Centrale                                                      */
/* ================================================================== */

function CentraleTab({
  products,
  setProducts,
}: {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}) {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Omit<Product, "id">>({
    name: "",
    category: "",
    qty: 0,
    unit: "kg",
    minStock: 0,
    cost: 0,
    supplier: "",
    notes: "",
  });

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.category.toLowerCase().includes(search.toLowerCase()) ||
          p.supplier.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search],
  );

  function addProduct() {
    if (!form.name.trim()) return;
    setProducts((prev) => [...prev, { ...form, id: `p-${Date.now()}` }]);
    setForm({ name: "", category: "", qty: 0, unit: "kg", minStock: 0, cost: 0, supplier: "", notes: "" });
  }

  function removeProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
      {/* Form */}
      <Card title="Nuovo prodotto" description="Registra un articolo in magazzino">
        <div className="space-y-3">
          <div>
            <label className={LABEL}>Nome prodotto</label>
            <input className={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="es. Farina Manitoba" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Categoria</label>
              <input className={INPUT} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Secchi, Latticini…" />
            </div>
            <div>
              <label className={LABEL}>Unità</label>
              <select className={INPUT} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                <option value="kg">kg</option>
                <option value="L">L</option>
                <option value="pz">pz</option>
                <option value="bt">bt</option>
                <option value="ct">ct</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Quantità</label>
              <input type="number" min="0" className={INPUT} value={form.qty || ""} onChange={(e) => setForm({ ...form, qty: parseFloat(e.target.value) || 0 })} placeholder="0" />
            </div>
            <div>
              <label className={LABEL}>Scorta minima</label>
              <input type="number" min="0" className={INPUT} value={form.minStock || ""} onChange={(e) => setForm({ ...form, minStock: parseFloat(e.target.value) || 0 })} placeholder="0" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Costo unitario (€)</label>
              <input type="number" min="0" step="0.01" className={INPUT} value={form.cost || ""} onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
            </div>
            <div>
              <label className={LABEL}>Fornitore</label>
              <input className={INPUT} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Nome fornitore" />
            </div>
          </div>
          <div>
            <label className={LABEL}>Note</label>
            <textarea className={cn(INPUT, "resize-y")} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Lotto, scadenza…" />
          </div>
          <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={addProduct}>
            <Plus className="h-4 w-4" /> Aggiungi prodotto
          </button>
        </div>
      </Card>

      {/* Product list */}
      <Card
        title="Inventario"
        description={`${filtered.length} prodotti`}
        headerRight={
          <div className="relative w-52">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
            <input className={cn(INPUT, "pl-9")} placeholder="Cerca…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        }
      >
        <DataTable
          columns={[
            { key: "name", header: "Prodotto", render: (r: Product) => (
              <div>
                <span className="font-medium text-rw-ink">{r.name}</span>
                {r.qty <= r.minStock && (
                  <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-400">Sotto scorta</span>
                )}
              </div>
            )},
            { key: "category", header: "Categoria" },
            { key: "qty", header: "Qtà", render: (r: Product) => `${r.qty} ${r.unit}` },
            { key: "cost", header: "Costo/u", render: (r: Product) => `€ ${r.cost.toFixed(2)}` },
            { key: "supplier", header: "Fornitore" },
            {
              key: "actions",
              header: "",
              render: (r: Product) => (
                <button type="button" onClick={() => removeProduct(r.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              ),
            },
          ]}
          data={filtered}
          keyExtractor={(r) => r.id}
          emptyMessage="Nessun prodotto trovato"
        />
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  Tab: Ricezione                                                     */
/* ================================================================== */

function RicezioneTab() {
  const [log, setLog] = useState<ReceivingEntry[]>([]);
  const [form, setForm] = useState({
    product: "",
    qty: "",
    unit: "kg",
    destination: "",
    operator: "",
    lot: "",
    cost: "",
    supplier: "",
  });

  function register() {
    if (!form.product.trim()) return;
    const entry: ReceivingEntry = {
      id: `rc-${Date.now()}`,
      product: form.product,
      qty: parseFloat(form.qty) || 0,
      unit: form.unit,
      destination: form.destination,
      operator: form.operator,
      lot: form.lot,
      cost: parseFloat(form.cost) || 0,
      supplier: form.supplier,
      date: new Date().toISOString().slice(0, 10),
    };
    setLog((prev) => [entry, ...prev]);
    setForm({ product: "", qty: "", unit: "kg", destination: "", operator: "", lot: "", cost: "", supplier: "" });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card title="Registra ricezione" description="Inserisci la merce in arrivo">
        <div className="space-y-3">
          <div>
            <label className={LABEL}>Prodotto</label>
            <input className={INPUT} value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="Nome prodotto" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={LABEL}>Quantità</label>
              <input type="number" min="0" className={INPUT} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className={LABEL}>Unità</label>
              <select className={INPUT} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                <option value="kg">kg</option>
                <option value="L">L</option>
                <option value="pz">pz</option>
                <option value="bt">bt</option>
                <option value="ct">ct</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Costo (€)</label>
              <input type="number" min="0" step="0.01" className={INPUT} value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="0.00" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Destinazione</label>
              <input className={INPUT} value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Magazzino, Frigo cucina…" />
            </div>
            <div>
              <label className={LABEL}>Operatore</label>
              <input className={INPUT} value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })} placeholder="Nome" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Lotto</label>
              <input className={INPUT} value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} placeholder="Codice lotto" />
            </div>
            <div>
              <label className={LABEL}>Fornitore</label>
              <input className={INPUT} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Nome fornitore" />
            </div>
          </div>
          <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={register}>
            <Download className="h-4 w-4" /> Registra
          </button>
        </div>
      </Card>

      <Card title="Log ricezioni" description={`${log.length} registrazioni`}>
        {log.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-rw-muted">
            <Truck className="h-10 w-10 opacity-40" />
            <p className="text-sm">Nessuna ricezione registrata in questa sessione</p>
          </div>
        ) : (
          <DataTable
            columns={[
              { key: "date", header: "Data" },
              { key: "product", header: "Prodotto" },
              { key: "qty", header: "Qtà", render: (r: ReceivingEntry) => `${r.qty} ${r.unit}` },
              { key: "supplier", header: "Fornitore" },
              { key: "destination", header: "Dest." },
              { key: "operator", header: "Operatore" },
              { key: "lot", header: "Lotto" },
              { key: "cost", header: "Costo", render: (r: ReceivingEntry) => `€ ${r.cost.toFixed(2)}` },
            ]}
            data={log}
            keyExtractor={(r) => r.id}
          />
        )}
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  Tab: Movimenti                                                     */
/* ================================================================== */

function MovimentiTab() {
  const [movements] = useState<Movement[]>(mockMovements);

  return (
    <Card title="Storico movimenti" description="Entrate, uscite, trasferimenti e scarichi">
      <DataTable
        columns={[
          { key: "date", header: "Data" },
          { key: "product", header: "Prodotto" },
          {
            key: "type",
            header: "Tipo",
            render: (r: Movement) => (
              <span className={cn("text-xs font-semibold uppercase", typeColors[r.type])}>
                {r.type}
              </span>
            ),
          },
          { key: "qty", header: "Qtà", render: (r: Movement) => String(r.qty) },
          { key: "from", header: "Da" },
          { key: "to", header: "A" },
          { key: "operator", header: "Operatore" },
        ]}
        data={movements}
        keyExtractor={(r) => r.id}
        emptyMessage="Nessun movimento registrato"
      />
    </Card>
  );
}

/* ================================================================== */
/*  Tab: Attrezzature                                                  */
/* ================================================================== */

function AttrezzatureTab() {
  const [equipment, setEquipment] = useState<Equipment[]>(mockEquipment);
  const [form, setForm] = useState<Omit<Equipment, "id">>({
    name: "",
    category: "",
    qty: 1,
    status: "operativo",
    location: "",
    value: 0,
  });

  function addEquipment() {
    if (!form.name.trim()) return;
    setEquipment((prev) => [...prev, { ...form, id: `eq-${Date.now()}` }]);
    setForm({ name: "", category: "", qty: 1, status: "operativo", location: "", value: 0 });
  }

  function removeEquipment(id: string) {
    setEquipment((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
      <Card title="Nuova attrezzatura" description="Registra un'attrezzatura o macchinario">
        <div className="space-y-3">
          <div>
            <label className={LABEL}>Nome</label>
            <input className={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="es. Forno combinato" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Categoria</label>
              <input className={INPUT} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Cucina, Bar…" />
            </div>
            <div>
              <label className={LABEL}>Quantità</label>
              <input type="number" min="1" className={INPUT} value={form.qty || ""} onChange={(e) => setForm({ ...form, qty: parseInt(e.target.value) || 1 })} placeholder="1" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Stato</label>
              <select className={INPUT} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Equipment["status"] })}>
                <option value="operativo">Operativo</option>
                <option value="manutenzione">Manutenzione</option>
                <option value="fuori uso">Fuori uso</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Ubicazione</label>
              <input className={INPUT} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Cucina, Sala…" />
            </div>
          </div>
          <div>
            <label className={LABEL}>Valore (€)</label>
            <input type="number" min="0" step="100" className={INPUT} value={form.value || ""} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} placeholder="0" />
          </div>
          <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={addEquipment}>
            <Plus className="h-4 w-4" /> Aggiungi attrezzatura
          </button>
        </div>
      </Card>

      <Card title="Inventario attrezzature" description={`${equipment.length} elementi`}>
        <DataTable
          columns={[
            { key: "name", header: "Nome", render: (r: Equipment) => <span className="font-medium text-rw-ink">{r.name}</span> },
            { key: "category", header: "Categoria" },
            { key: "qty", header: "Qtà", render: (r: Equipment) => String(r.qty) },
            {
              key: "status",
              header: "Stato",
              render: (r: Equipment) => (
                <span className={cn("inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase", statusColors[r.status])}>
                  {r.status}
                </span>
              ),
            },
            { key: "location", header: "Ubicazione" },
            { key: "value", header: "Valore", render: (r: Equipment) => `€ ${r.value.toLocaleString("it-IT")}` },
            {
              key: "actions",
              header: "",
              render: (r: Equipment) => (
                <button type="button" onClick={() => removeEquipment(r.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              ),
            },
          ]}
          data={equipment}
          keyExtractor={(r) => r.id}
          emptyMessage="Nessuna attrezzatura registrata"
        />
      </Card>
    </div>
  );
}
