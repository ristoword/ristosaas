"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { ArrowDownUp, ArrowLeftRight, Download, Edit2, Loader2, Plus, Save, Search, ShoppingCart, Sparkles, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { TabBar } from "@/components/shared/tab-bar";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { AiChat, AiToggleButton } from "@/components/ai/ai-chat";
import { VoiceButton } from "@/components/ai/ai-voice";
import { useWarehouse } from "@/components/warehouse/warehouse-context";
import type { StockItem, StockMovement } from "@/components/warehouse/warehouse-context";
import {
  suppliersApi,
  warehouseApi,
  warehouseVoiceApi,
  type Supplier,
  type WarehouseEquipment as Equipment,
} from "@/lib/api-client";
import { Modal } from "@/components/shared/modal";
import {
  WAREHOUSE_LOCATIONS,
  WAREHOUSE_LOCATION_LABELS,
  type WarehouseLocation,
} from "@/lib/api/types/warehouse";

type ShoppingItem = { id: string; product: string; qty: number; unit: string; supplier: string; done: boolean };

const TABS = [
  { id: "centrale", label: "Centrale" },
  { id: "reparti", label: "Reparti" },
  { id: "ricezione", label: "Ricezione" },
  { id: "movimenti", label: "Movimenti" },
  { id: "lista-spesa", label: "Lista spesa" },
  { id: "attrezzature", label: "Attrezzature" },
];

const INPUT = "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";
const LABEL = "block text-xs font-semibold text-rw-muted mb-1";
const BTN_PRIMARY = "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

const statusColors: Record<Equipment["status"], string> = {
  operativo: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  manutenzione: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  "fuori uso": "border-red-500/30 bg-red-500/10 text-red-400",
};

async function persistWarehouseVoice(transcript: string) {
  try {
    await warehouseVoiceApi.append(transcript);
  } catch (e) {
    window.alert(e instanceof Error ? e.message : "Impossibile salvare il comando vocale.");
  }
}

export function MagazzinoPage() {
  const [tab, setTab] = useState("centrale");
  const [aiOpen, setAiOpen] = useState(false);
  const { stock, totalStockValue, lowStockItems, movements } = useWarehouse();

  const stockVal = totalStockValue();
  const lowItems = lowStockItems();

  return (
    <div className="space-y-6">
      <PageHeader title="Magazzino" subtitle="Scorte, ricezione merce, movimenti e attrezzature">
        <Chip label="Prodotti" value={stock.length} tone="info" />
        <Chip label="Sotto scorta" value={lowItems.length} tone={lowItems.length > 0 ? "danger" : "default"} />
        <Chip label="Valore totale" value={`€ ${stockVal.toFixed(2)}`} tone="accent" />
        <VoiceButton onResult={(text) => void persistWarehouseVoice(text)} />
        <AiToggleButton onClick={() => setAiOpen(true)} label="AI Magazzino" />
      </PageHeader>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === "centrale" && <CentraleTab />}
      {tab === "reparti" && <RepartiTab />}
      {tab === "ricezione" && <RicezioneTab />}
      {tab === "movimenti" && <MovimentiTab />}
      {tab === "lista-spesa" && <ListaSpesaTab />}
      {tab === "attrezzature" && <AttrezzatureTab />}

      <AiChat context="magazzino" open={aiOpen} onClose={() => setAiOpen(false)} title="AI Magazzino" />
    </div>
  );
}

function CentraleTab() {
  const { stock, addStock } = useWarehouse();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", category: "", qty: 0, unit: "kg", minStock: 0, costPerUnit: 0, supplier: "" });

  const filtered = useMemo(
    () => stock.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()) || p.supplier.toLowerCase().includes(search.toLowerCase())),
    [stock, search],
  );

  function handleAdd() {
    if (!form.name.trim()) return;
    addStock(form);
    setForm({ name: "", category: "", qty: 0, unit: "kg", minStock: 0, costPerUnit: 0, supplier: "" });
  }

  function handleVoice(text: string) {
    setForm((f) => ({ ...f, name: text }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
      <Card
        title="Nuovo prodotto"
        description="Manuale o con comando vocale"
        headerRight={
          <VoiceButton
            compact
            onResult={(text) => {
              handleVoice(text);
              void persistWarehouseVoice(text);
            }}
          />
        }
      >
        <div className="space-y-3">
          <div><label className={LABEL}>Nome prodotto</label><input className={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="es. Farina Manitoba" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={LABEL}>Categoria</label><input className={INPUT} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Secchi, Latticini…" /></div>
            <div><label className={LABEL}>Unità</label><select className={INPUT} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}><option value="kg">kg</option><option value="L">L</option><option value="pz">pz</option><option value="bt">bt</option><option value="ct">ct</option></select></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={LABEL}>Quantità</label><input type="number" min="0" className={INPUT} value={form.qty || ""} onChange={(e) => setForm({ ...form, qty: parseFloat(e.target.value) || 0 })} placeholder="0" /></div>
            <div><label className={LABEL}>Scorta minima</label><input type="number" min="0" className={INPUT} value={form.minStock || ""} onChange={(e) => setForm({ ...form, minStock: parseFloat(e.target.value) || 0 })} placeholder="0" /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={LABEL}>Costo unitario (€)</label><input type="number" min="0" step="0.01" className={INPUT} value={form.costPerUnit || ""} onChange={(e) => setForm({ ...form, costPerUnit: parseFloat(e.target.value) || 0 })} placeholder="0.00" /></div>
            <div><label className={LABEL}>Fornitore</label><input className={INPUT} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Nome fornitore" /></div>
          </div>
          <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={handleAdd}><Plus className="h-4 w-4" /> Aggiungi prodotto</button>
        </div>
      </Card>

      <Card title="Inventario" description={`${filtered.length} prodotti`} headerRight={<div className="relative w-52"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" /><input className={cn(INPUT, "pl-9")} placeholder="Cerca…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>}>
        <DataTable
          columns={[
            { key: "name", header: "Prodotto", render: (r: StockItem) => (<div><span className="font-medium text-rw-ink">{r.name}</span>{r.qty <= r.minStock && (<span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-400">Sotto scorta</span>)}</div>) },
            { key: "category", header: "Categoria" },
            { key: "qty", header: "Qtà", render: (r: StockItem) => `${r.qty} ${r.unit}` },
            { key: "costPerUnit", header: "Costo/u", render: (r: StockItem) => `€ ${r.costPerUnit.toFixed(2)}` },
            { key: "supplier", header: "Fornitore" },
          ]}
          data={filtered}
          keyExtractor={(r) => r.id}
          emptyMessage="Nessun prodotto trovato"
        />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab Reparti — scorte operative per area                            */
/* ------------------------------------------------------------------ */

const LOCATION_COLORS: Record<string, string> = {
  MAGAZZINO_CENTRALE: "bg-rw-accent/15 text-rw-accent border-rw-accent/30",
  CUCINA: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  PIZZERIA: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  BAR: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  SALA: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  PROPRIETA: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  ALTRO: "bg-rw-surfaceAlt text-rw-muted border-rw-line",
};

function RepartiTab() {
  const { stock, refresh } = useWarehouse();
  const [transferOpen, setTransferOpen] = useState(false);
  const [form, setForm] = useState<{
    warehouseItemId: string;
    fromLocation: WarehouseLocation;
    toLocation: WarehouseLocation;
    qty: string;
    reason: string;
    note: string;
  }>({
    warehouseItemId: "",
    fromLocation: "MAGAZZINO_CENTRALE",
    toLocation: "CUCINA",
    qty: "",
    reason: "Trasferimento reparto",
    note: "",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Prodotti che hanno almeno una scorta in qualche reparto
  const itemsWithDept = useMemo(() => {
    return stock.filter(
      (s) => s.locationStocks && s.locationStocks.length > 0
    );
  }, [stock]);

  async function handleTransfer() {
    if (!form.warehouseItemId || !form.qty) return;
    const qty = parseFloat(form.qty);
    if (isNaN(qty) || qty <= 0) { setError("Inserisci una quantità valida > 0"); return; }
    setSending(true);
    setError(null);
    try {
      await warehouseApi.createMovement({
        warehouseItemId: form.warehouseItemId,
        type: "trasferimento",
        qty,
        reason: form.reason || "Trasferimento reparto",
        fromLocation: form.fromLocation,
        toLocation: form.toLocation,
        note: form.note || undefined,
      });
      setFlash(`Trasferimento registrato: ${qty} unità da ${WAREHOUSE_LOCATION_LABELS[form.fromLocation]} a ${WAREHOUSE_LOCATION_LABELS[form.toLocation]}`);
      setTransferOpen(false);
      setForm((f) => ({ ...f, warehouseItemId: "", qty: "", note: "" }));
      await refresh();
      setTimeout(() => setFlash(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore durante il trasferimento");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      {flash && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
          {flash}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-rw-muted">
          Scorte operative nei reparti (derivate dai trasferimenti dal Magazzino Centrale).
        </p>
        <button
          type="button"
          onClick={() => setTransferOpen(true)}
          className={cn(BTN_PRIMARY, "gap-2")}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Nuovo trasferimento
        </button>
      </div>

      {itemsWithDept.length === 0 ? (
        <Card title="Nessuna scorta nei reparti">
          <p className="py-4 text-sm text-rw-muted text-center">
            Nessun prodotto ha ancora scorte nei reparti. Usa &ldquo;Nuovo trasferimento&rdquo; per spostare merce dal Magazzino Centrale verso Cucina, Pizzeria, Bar, Sala o Proprietà.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-rw-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Prodotto</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">Centrale</th>
                {(["CUCINA", "PIZZERIA", "BAR", "SALA", "PROPRIETA", "ALTRO"] as WarehouseLocation[]).map((loc) => (
                  <th key={loc} className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">
                    {WAREHOUSE_LOCATION_LABELS[loc]}
                  </th>
                ))}
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-rw-accent">Totale</th>
              </tr>
            </thead>
            <tbody>
              {itemsWithDept.map((item) => {
                const getLocQty = (loc: string) =>
                  (item.locationStocks ?? []).find((l) => l.location === loc)?.qty ?? 0;
                return (
                  <tr key={item.id} className="border-b border-rw-line/50 hover:bg-rw-surfaceAlt/50">
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-rw-ink">{item.name}</span>
                      <span className="ml-2 text-xs text-rw-muted">{item.unit}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-rw-soft">{item.qty.toFixed(3)}</td>
                    {(["CUCINA", "PIZZERIA", "BAR", "SALA", "PROPRIETA", "ALTRO"] as WarehouseLocation[]).map((loc) => {
                      const q = getLocQty(loc);
                      return (
                        <td key={loc} className={cn("px-3 py-2.5 text-right tabular-nums", q > 0 ? "font-semibold text-rw-ink" : "text-rw-muted")}>
                          {q > 0 ? q.toFixed(3) : "—"}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-rw-accent">
                      {(item.totalQty ?? item.qty).toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Anche i prodotti senza scorte reparto, con totale */}
      {stock.filter((s) => !s.locationStocks || s.locationStocks.length === 0).length > 0 && (
        <details className="rounded-xl border border-rw-line">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-rw-muted hover:text-rw-ink">
            Prodotti solo in Magazzino Centrale ({stock.filter((s) => !s.locationStocks || s.locationStocks.length === 0).length})
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {stock.filter((s) => !s.locationStocks || s.locationStocks.length === 0).map((item) => (
                  <tr key={item.id} className="border-t border-rw-line/30">
                    <td className="px-4 py-2.5 font-medium text-rw-soft">{item.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-rw-muted">{item.qty.toFixed(3)} {item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Trasferimento tra reparti">
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Prodotto</label>
            <select
              className={INPUT}
              value={form.warehouseItemId}
              onChange={(e) => setForm((f) => ({ ...f, warehouseItemId: e.target.value }))}
            >
              <option value="">Seleziona prodotto…</option>
              {stock.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — Centrale: {s.qty} {s.unit}
                  {s.locationStocks && s.locationStocks.length > 0
                    ? ` | Reparti: ${s.locationStocks.map((l) => `${WAREHOUSE_LOCATION_LABELS[l.location as WarehouseLocation] ?? l.location} ${l.qty}`).join(", ")}`
                    : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Da</label>
              <select className={INPUT} value={form.fromLocation} onChange={(e) => setForm((f) => ({ ...f, fromLocation: e.target.value as WarehouseLocation }))}>
                {WAREHOUSE_LOCATIONS.map((l) => (
                  <option key={l} value={l}>{WAREHOUSE_LOCATION_LABELS[l]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>A</label>
              <select className={INPUT} value={form.toLocation} onChange={(e) => setForm((f) => ({ ...f, toLocation: e.target.value as WarehouseLocation }))}>
                {WAREHOUSE_LOCATIONS.map((l) => (
                  <option key={l} value={l}>{WAREHOUSE_LOCATION_LABELS[l]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>Quantità</label>
            <input type="number" min="0" step="0.001" className={INPUT} value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} placeholder="0" />
          </div>
          <div>
            <label className={LABEL}>Motivo</label>
            <input className={INPUT} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="es. Rifornimento cucina" />
          </div>
          <div>
            <label className={LABEL}>Nota (opzionale)</label>
            <input className={INPUT} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Note aggiuntive…" />
          </div>
          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={() => void handleTransfer()} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
            {sending ? "Trasferimento in corso…" : "Conferma trasferimento"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function RicezioneTab() {
  const { stock, loadStock } = useWarehouse();
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  function handleVoice(text: string) {
    const lower = text.toLowerCase();
    const found = stock.find((s) => lower.includes(s.name.toLowerCase()));
    if (found) {
      setSelectedProduct(found.id);
      const nums = text.match(/\d+/);
      if (nums) setQty(nums[0]);
    }
  }

  function handleRegister() {
    if (!selectedProduct || !qty) return;
    loadStock(selectedProduct, parseFloat(qty), "Ricezione merce");
    setFlash(`Caricato ${qty} unità di ${stock.find((s) => s.id === selectedProduct)?.name}`);
    setSelectedProduct(""); setQty("");
    setTimeout(() => setFlash(null), 3000);
  }

  return (
    <div className="space-y-4">
      {flash && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">{flash}</div>}
      <Card title="Registra ricezione" description="Manuale o con comando vocale" headerRight={<VoiceButton onResult={handleVoice} compact />}>
        <div className="space-y-3">
          <div><label className={LABEL}>Prodotto</label><select className={INPUT} value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}><option value="">Seleziona…</option>{stock.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.qty} {s.unit})</option>)}</select></div>
          <div><label className={LABEL}>Quantità da caricare</label><input type="number" min="0" className={INPUT} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" /></div>
          <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={handleRegister}><Download className="h-4 w-4" /> Registra carico</button>
        </div>
      </Card>
    </div>
  );
}

const MOVEMENT_TYPE_COLORS: Record<string, string> = {
  carico: "text-emerald-400",
  scarico: "text-red-400",
  scarico_comanda: "text-amber-400",
  trasferimento: "text-sky-400",
  rettifica: "text-purple-400",
};

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  carico: "Carico",
  scarico: "Scarico",
  scarico_comanda: "Scarico comanda",
  trasferimento: "Trasferimento",
  rettifica: "Rettifica",
};

function MovimentiTab() {
  const { movements, stock, refresh } = useWarehouse();
  const [createOpen, setCreateOpen] = useState(false);
  const [editMovement, setEditMovement] = useState<StockMovement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState<{
    warehouseItemId: string;
    type: "carico" | "scarico" | "trasferimento" | "rettifica";
    qty: string;
    newQty: string;
    fromLocation: WarehouseLocation;
    toLocation: WarehouseLocation;
    reason: string;
    note: string;
  }>({
    warehouseItemId: "",
    type: "carico",
    qty: "",
    newQty: "",
    fromLocation: "MAGAZZINO_CENTRALE",
    toLocation: "CUCINA",
    reason: "",
    note: "",
  });

  const [editForm, setEditForm] = useState({ reason: "", note: "" });

  function openCreate() {
    setForm({ warehouseItemId: "", type: "carico", qty: "", newQty: "", fromLocation: "MAGAZZINO_CENTRALE", toLocation: "CUCINA", reason: "", note: "" });
    setError(null);
    setCreateOpen(true);
  }

  function openEdit(mv: StockMovement) {
    setEditMovement(mv);
    setEditForm({ reason: mv.reason, note: mv.note ?? "" });
    setError(null);
  }

  async function handleCreate() {
    if (!form.warehouseItemId) { setError("Seleziona un prodotto"); return; }
    const qty = parseFloat(form.qty);
    if (form.type !== "rettifica" && (isNaN(qty) || qty <= 0)) { setError("Inserisci una quantità valida > 0"); return; }
    setSending(true);
    setError(null);
    try {
      const payload: Parameters<typeof warehouseApi.createMovement>[0] = {
        warehouseItemId: form.warehouseItemId,
        type: form.type,
        qty: form.type === "rettifica" ? Math.abs(parseFloat(form.newQty) || 0) : qty,
        reason: form.reason || `${MOVEMENT_TYPE_LABELS[form.type]} manuale`,
        note: form.note || undefined,
      };
      if (form.type === "trasferimento") {
        payload.fromLocation = form.fromLocation;
        payload.toLocation = form.toLocation;
      } else if (form.type === "rettifica") {
        payload.fromLocation = form.fromLocation;
        payload.newQty = parseFloat(form.newQty) || 0;
      } else if (form.type === "scarico") {
        payload.fromLocation = form.fromLocation;
      } else if (form.type === "carico") {
        payload.toLocation = form.toLocation;
      }
      await warehouseApi.createMovement(payload);
      setFlash(`Movimento "${MOVEMENT_TYPE_LABELS[form.type]}" registrato con successo.`);
      setCreateOpen(false);
      await refresh();
      setTimeout(() => setFlash(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore durante la registrazione");
    } finally {
      setSending(false);
    }
  }

  async function handleEdit() {
    if (!editMovement) return;
    setSending(true);
    setError(null);
    try {
      await warehouseApi.patchMovement(editMovement.id, {
        reason: editForm.reason,
        note: editForm.note,
      });
      setFlash("Movimento aggiornato.");
      setEditMovement(null);
      await refresh();
      setTimeout(() => setFlash(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore aggiornamento");
    } finally {
      setSending(false);
    }
  }

  const showFromLocation = form.type === "trasferimento" || form.type === "scarico" || form.type === "rettifica";
  const showToLocation = form.type === "trasferimento" || form.type === "carico";

  return (
    <div className="space-y-4">
      {flash && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
          {flash}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-rw-muted">{movements.length} movimenti registrati su DB.</p>
        <button type="button" className={cn(BTN_PRIMARY, "gap-2")} onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuovo movimento
        </button>
      </div>

      {movements.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-rw-muted">
          <ArrowDownUp className="h-10 w-10 opacity-40" />
          <p className="text-sm">Nessun movimento registrato</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-rw-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Prodotto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Tipo</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">Qtà</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Da → A</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Motivo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Nota</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {movements.map((mv) => (
                <tr key={mv.id} className="border-b border-rw-line/50 hover:bg-rw-surfaceAlt/40">
                  <td className="px-4 py-2.5 text-rw-muted tabular-nums text-xs">{mv.date}</td>
                  <td className="px-4 py-2.5 font-medium text-rw-ink">{mv.productName}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("text-xs font-semibold uppercase", MOVEMENT_TYPE_COLORS[mv.type] ?? "text-rw-muted")}>
                      {MOVEMENT_TYPE_LABELS[mv.type] ?? mv.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-rw-soft">{mv.qty} {mv.unit}</td>
                  <td className="px-4 py-2.5 text-xs text-rw-muted">
                    {mv.fromLocation || mv.toLocation ? (
                      <span>
                        {mv.fromLocation ? (WAREHOUSE_LOCATION_LABELS[mv.fromLocation as WarehouseLocation] ?? mv.fromLocation) : "—"}
                        {mv.toLocation ? ` → ${WAREHOUSE_LOCATION_LABELS[mv.toLocation as WarehouseLocation] ?? mv.toLocation}` : ""}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-rw-soft text-xs max-w-[160px] truncate">{mv.reason}</td>
                  <td className="px-4 py-2.5 text-rw-muted text-xs italic max-w-[120px] truncate">{mv.note ?? "—"}</td>
                  <td className="px-2 py-2.5">
                    <button
                      type="button"
                      onClick={() => openEdit(mv)}
                      title="Modifica motivo/nota"
                      className="rounded-lg border border-rw-line p-1.5 text-rw-muted hover:text-rw-ink"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Nuovo Movimento */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuovo movimento magazzino" wide>
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Prodotto *</label>
            <select className={INPUT} value={form.warehouseItemId} onChange={(e) => setForm((f) => ({ ...f, warehouseItemId: e.target.value }))}>
              <option value="">— Seleziona un prodotto esistente —</option>
              {stock.length === 0 && <option disabled>Nessun prodotto in magazzino. Creane uno prima nella tab Centrale.</option>}
              {stock.map((s) => (
                <option key={s.id} value={s.id}>{s.name} (centrale: {s.qty} {s.unit})</option>
              ))}
            </select>
            {stock.length === 0 && (
              <p className="mt-1 text-xs text-amber-400">
                Crea prima il prodotto/ingrediente in anagrafica magazzino (tab &ldquo;Centrale&rdquo;).
              </p>
            )}
          </div>

          <div>
            <label className={LABEL}>Tipo movimento *</label>
            <select className={INPUT} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof f.type }))}>
              <option value="carico">Carico (in entrata nel magazzino)</option>
              <option value="scarico">Scarico (uscita da un reparto o dal centrale)</option>
              <option value="trasferimento">Trasferimento (da un reparto a un altro)</option>
              <option value="rettifica">Rettifica (imposta quantità esatta)</option>
            </select>
          </div>

          {form.type === "rettifica" ? (
            <div>
              <label className={LABEL}>Nuova quantità assoluta *</label>
              <input type="number" min="0" step="0.001" className={INPUT} value={form.newQty} onChange={(e) => setForm((f) => ({ ...f, newQty: e.target.value }))} placeholder="es. 45.5" />
            </div>
          ) : (
            <div>
              <label className={LABEL}>Quantità *</label>
              <input type="number" min="0" step="0.001" className={INPUT} value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} placeholder="es. 10" />
            </div>
          )}

          {showFromLocation && (
            <div>
              <label className={LABEL}>{form.type === "rettifica" ? "Reparto da rettificare" : "Da reparto"}</label>
              <select className={INPUT} value={form.fromLocation} onChange={(e) => setForm((f) => ({ ...f, fromLocation: e.target.value as WarehouseLocation }))}>
                {WAREHOUSE_LOCATIONS.map((l) => (
                  <option key={l} value={l}>{WAREHOUSE_LOCATION_LABELS[l]}</option>
                ))}
              </select>
            </div>
          )}

          {showToLocation && (
            <div>
              <label className={LABEL}>A reparto</label>
              <select className={INPUT} value={form.toLocation} onChange={(e) => setForm((f) => ({ ...f, toLocation: e.target.value as WarehouseLocation }))}>
                {WAREHOUSE_LOCATIONS.map((l) => (
                  <option key={l} value={l}>{WAREHOUSE_LOCATION_LABELS[l]}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={LABEL}>Motivo</label>
            <input className={INPUT} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder={`es. ${MOVEMENT_TYPE_LABELS[form.type]} manuale`} />
          </div>

          <div>
            <label className={LABEL}>Nota (opzionale)</label>
            <input className={INPUT} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Note aggiuntive…" />
          </div>

          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

          <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={() => void handleCreate()} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {sending ? "Salvataggio…" : "Registra movimento"}
          </button>
        </div>
      </Modal>

      {/* Modal: Modifica Movimento */}
      <Modal open={!!editMovement} onClose={() => setEditMovement(null)} title="Modifica movimento">
        <div className="space-y-4">
          {editMovement && (
            <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-xs text-rw-muted space-y-1">
              <p><span className="font-semibold text-rw-soft">Prodotto:</span> {editMovement.productName}</p>
              <p><span className="font-semibold text-rw-soft">Tipo:</span> {MOVEMENT_TYPE_LABELS[editMovement.type] ?? editMovement.type}</p>
              <p><span className="font-semibold text-rw-soft">Quantità:</span> {editMovement.qty} {editMovement.unit}</p>
              <p className="text-[10px] text-rw-muted">Le quantità non vengono ricalcolate. Per correggere, crea una rettifica.</p>
            </div>
          )}
          <div>
            <label className={LABEL}>Motivo</label>
            <input className={INPUT} value={editForm.reason} onChange={(e) => setEditForm((f) => ({ ...f, reason: e.target.value }))} />
          </div>
          <div>
            <label className={LABEL}>Nota</label>
            <input className={INPUT} value={editForm.note} onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))} placeholder="Note aggiuntive…" />
          </div>
          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={() => void handleEdit()} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {sending ? "Salvataggio…" : "Salva modifiche"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function ListaSpesaTab() {
  const { lowStockItems, stock, refresh } = useWarehouse();
  const low = lowStockItems();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [product, setProduct] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("kg");
  const [supplier, setSupplier] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);

  function addItem() {
    if (!product.trim()) return;
    setItems((p) => [...p, { id: `sp-${Date.now()}`, product, qty: parseFloat(qty) || 0, unit, supplier, done: false }]);
    setProduct(""); setQty(""); setSupplier("");
  }

  function handleVoice(text: string) {
    setProduct(text);
  }

  function autoFromLowStock() {
    const newItems = low.filter((l) => !items.some((i) => i.product === l.name)).map((l) => ({
      id: `sp-${Date.now()}-${l.id}`,
      product: l.name,
      qty: l.minStock * 2 - l.qty,
      unit: l.unit,
      supplier: l.supplier,
      done: false,
    }));
    setItems((p) => [...p, ...newItems]);
  }

  function toggleDone(id: string) {
    setItems((p) => p.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="space-y-4">
        <Card title="Aggiungi alla lista" headerRight={<VoiceButton onResult={handleVoice} compact />}>
          <div className="space-y-3">
            <div><label className={LABEL}>Prodotto</label><input className={INPUT} value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Nome prodotto" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={LABEL}>Quantità</label><input type="number" min="0" className={INPUT} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" /></div>
              <div><label className={LABEL}>Unità</label><select className={INPUT} value={unit} onChange={(e) => setUnit(e.target.value)}><option value="kg">kg</option><option value="L">L</option><option value="pz">pz</option><option value="bt">bt</option><option value="ct">ct</option></select></div>
            </div>
            <div><label className={LABEL}>Fornitore</label><input className={INPUT} value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Nome fornitore" /></div>
            <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={addItem}><Plus className="h-4 w-4" /> Aggiungi</button>
          </div>
        </Card>

        {low.length > 0 && (
          <Card title="Suggerimenti AI" description={`${low.length} prodotti sotto scorta`} headerRight={<Sparkles className="h-4 w-4 text-rw-accent" />}>
            <div className="space-y-2">
              {low.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-rw-ink">{l.name}</p>
                    <p className="text-xs text-rw-muted">{l.qty} {l.unit} (min: {l.minStock}) — {l.supplier}</p>
                  </div>
                  <span className="text-xs font-bold text-red-400">Riordinare</span>
                </div>
              ))}
              <button type="button" onClick={autoFromLowStock} className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-4 py-2 text-xs font-semibold text-rw-accent hover:bg-rw-accent/20">
                <Sparkles className="h-3.5 w-3.5" /> Aggiungi tutti alla lista
              </button>
            </div>
          </Card>
        )}
      </div>

      <Card
        title="Lista della spesa"
        description={`${items.length} prodotti`}
        headerRight={
          <button
            type="button"
            onClick={() => setSuggestOpen(true)}
            className={cn(BTN_PRIMARY, "px-3 py-2 text-xs")}
            disabled={low.length === 0 && stock.length === 0}
          >
            <Sparkles className="h-3.5 w-3.5" /> Suggerisci ordine fornitore
          </button>
        }
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-rw-muted"><ShoppingCart className="h-10 w-10 opacity-40" /><p className="text-sm">Lista vuota</p></div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className={cn("flex items-center justify-between rounded-xl border px-4 py-3 transition", item.done ? "border-emerald-500/30 bg-emerald-500/5 opacity-60" : "border-rw-line bg-rw-surfaceAlt")}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={item.done} onChange={() => toggleDone(item.id)} className="h-4 w-4 rounded border-rw-line text-rw-accent focus:ring-rw-accent" />
                  <div>
                    <p className={cn("text-sm font-medium", item.done ? "line-through text-rw-muted" : "text-rw-ink")}>{item.product}</p>
                    <p className="text-xs text-rw-muted">{item.qty} {item.unit} — {item.supplier || "nessun fornitore"}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setItems((p) => p.filter((i) => i.id !== item.id))} className="text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <SuggerisciOrdineModal
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        onCreated={async () => {
          setSuggestOpen(false);
          await refresh();
        }}
      />
    </div>
  );
}

type SuggestedLine = {
  warehouseItemId: string;
  name: string;
  unit: string;
  supplierHint: string;
  suggestedQty: number;
  unitCost: number;
  qtyOrdered: number;
};

type SupplierGroup = {
  supplierName: string;
  lines: SuggestedLine[];
};

function SuggerisciOrdineModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<SupplierGroup[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [assignedSupplierId, setAssignedSupplierId] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"bozza" | "inviato">("inviato");
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [reorderRes, stockRes, suppliersRes] = await Promise.all([
          warehouseApi.reorder(14),
          warehouseApi.list(),
          suppliersApi.list(),
        ]);
        if (cancelled) return;
        const stockIndex = new Map(stockRes.items.map((it) => [it.id, it]));
        const bySupplier = new Map<string, SupplierGroup>();

        for (const row of reorderRes.reorder) {
          const stockItem = stockIndex.get(row.warehouseItemId);
          if (!stockItem) continue;
          const supplierHint = stockItem.supplier?.trim() || "Senza fornitore";
          const qty = row.suggestedOrderQty > 0 ? row.suggestedOrderQty : Math.max(0, row.minStock * 2 - row.qty);
          const line: SuggestedLine = {
            warehouseItemId: stockItem.id,
            name: stockItem.name,
            unit: stockItem.unit,
            supplierHint,
            suggestedQty: Number(qty.toFixed(3)),
            unitCost: stockItem.costPerUnit,
            qtyOrdered: Number(qty.toFixed(3)),
          };
          const key = supplierHint.toLowerCase();
          if (!bySupplier.has(key)) {
            bySupplier.set(key, { supplierName: supplierHint, lines: [line] });
          } else {
            bySupplier.get(key)!.lines.push(line);
          }
        }

        const groupsArr = Array.from(bySupplier.values());
        setGroups(groupsArr);
        setSuppliers(suppliersRes);

        // Pre-assegna il fornitore anagrafico via match per nome (case-insensitive)
        const prefill: Record<string, string> = {};
        for (const group of groupsArr) {
          const match = suppliersRes.find(
            (s) => s.name.trim().toLowerCase() === group.supplierName.trim().toLowerCase(),
          );
          if (match) prefill[group.supplierName] = match.id;
        }
        setAssignedSupplierId(prefill);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Caricamento suggerimenti fallito.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function updateLine(supplierName: string, lineIndex: number, patch: Partial<SuggestedLine>) {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.supplierName !== supplierName) return group;
        return {
          ...group,
          lines: group.lines.map((line, i) => (i === lineIndex ? { ...line, ...patch } : line)),
        };
      }),
    );
  }

  function removeLine(supplierName: string, lineIndex: number) {
    setGroups((prev) =>
      prev
        .map((group) => {
          if (group.supplierName !== supplierName) return group;
          return { ...group, lines: group.lines.filter((_, i) => i !== lineIndex) };
        })
        .filter((group) => group.lines.length > 0),
    );
  }

  async function handleCreateGroup(group: SupplierGroup) {
    const supplierId = assignedSupplierId[group.supplierName];
    if (!supplierId) {
      setError(`Seleziona un fornitore dall anagrafica per "${group.supplierName}".`);
      return;
    }
    const lines = group.lines.filter((line) => line.qtyOrdered > 0);
    if (lines.length === 0) {
      setError("Nessuna riga con quantità > 0 per questo fornitore.");
      return;
    }
    setError(null);
    setCreatingFor(group.supplierName);
    try {
      await suppliersApi.createOrder(supplierId, {
        status,
        items: lines.map((line) => ({
          warehouseItemId: line.warehouseItemId,
          qtyOrdered: line.qtyOrdered,
          unit: line.unit,
          unitCost: line.unitCost,
        })),
      });
      setFlash(`Ordine creato per ${group.supplierName}.`);
      setGroups((prev) => prev.filter((g) => g.supplierName !== group.supplierName));
      setTimeout(() => setFlash(null), 2500);
      if (onCreated) void onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creazione ordine fallita.");
    } finally {
      setCreatingFor(null);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Suggerisci ordine fornitore"
      subtitle="Genera ordini d acquisto raggruppati per fornitore a partire dalle scorte sotto soglia."
      wide
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className={LABEL}>Stato</label>
          <select
            className={INPUT}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            style={{ maxWidth: 180 }}
          >
            <option value="bozza">Bozza</option>
            <option value="inviato">Inviato</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-rw-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Calcolo suggerimenti…
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300"
          >
            {error}
          </p>
        ) : null}
        {flash ? (
          <p
            role="status"
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300"
          >
            {flash}
          </p>
        ) : null}

        {!loading && groups.length === 0 ? (
          <p className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-6 text-center text-sm text-rw-muted">
            Nessun prodotto da riordinare al momento.
          </p>
        ) : null}

        {groups.map((group) => {
          const supplierId = assignedSupplierId[group.supplierName] ?? "";
          const total = group.lines.reduce((sum, l) => sum + l.qtyOrdered * l.unitCost, 0);
          const supplierOptions = suppliers;
          const unassigned = !supplierId;
          return (
            <div
              key={group.supplierName}
              className={cn(
                "rounded-2xl border bg-rw-surfaceAlt p-4",
                unassigned ? "border-amber-500/40" : "border-rw-line",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-rw-ink">{group.supplierName}</p>
                  <p className="text-xs text-rw-muted">
                    {group.lines.length} articoli • totale stimato €{total.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className={INPUT}
                    style={{ maxWidth: 260 }}
                    value={supplierId}
                    onChange={(e) =>
                      setAssignedSupplierId((prev) => ({
                        ...prev,
                        [group.supplierName]: e.target.value,
                      }))
                    }
                  >
                    <option value="">Seleziona fornitore da anagrafica…</option>
                    {supplierOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={cn(BTN_PRIMARY, "whitespace-nowrap")}
                    onClick={() => void handleCreateGroup(group)}
                    disabled={creatingFor === group.supplierName || unassigned || group.lines.length === 0}
                  >
                    {creatingFor === group.supplierName ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Crea ordine
                  </button>
                </div>
              </div>

              {unassigned ? (
                <p className="mt-2 text-xs text-amber-300">
                  Collega questo nome fornitore (&quot;{group.supplierName}&quot;) a un record d anagrafica
                  per poter creare l ordine.
                </p>
              ) : null}

              <div className="mt-3 space-y-2">
                {group.lines.map((line, index) => {
                  const lineTotal = line.qtyOrdered * line.unitCost;
                  return (
                    <div
                      key={`${line.warehouseItemId}-${index}`}
                      className="grid gap-2 rounded-xl border border-rw-line bg-rw-surface p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-rw-ink">{line.name}</p>
                        <p className="text-xs text-rw-muted">Unità {line.unit}</p>
                      </div>
                      <div>
                        <p className="text-xs text-rw-muted">Qtà da ordinare</p>
                        <input
                          type="number"
                          min={0}
                          step={0.001}
                          className={INPUT}
                          value={line.qtyOrdered}
                          onChange={(e) =>
                            updateLine(group.supplierName, index, {
                              qtyOrdered: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />
                      </div>
                      <div>
                        <p className="text-xs text-rw-muted">Costo unitario</p>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className={INPUT}
                          value={line.unitCost}
                          onChange={(e) =>
                            updateLine(group.supplierName, index, {
                              unitCost: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />
                      </div>
                      <div>
                        <p className="text-xs text-rw-muted">Subtotale</p>
                        <p className="text-sm font-semibold text-rw-ink">€{lineTotal.toFixed(2)}</p>
                      </div>
                      <button
                        type="button"
                        aria-label="Rimuovi riga"
                        className="inline-flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 px-2 text-xs font-semibold text-red-400"
                        onClick={() => removeLine(group.supplierName, index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="flex justify-end pt-2">
          <button type="button" className={cn(BTN_PRIMARY, "bg-rw-surfaceAlt text-rw-ink")} onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AttrezzatureTab() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Omit<Equipment, "id">>({ name: "", category: "", qty: 1, status: "operativo", location: "", value: 0 });

  const loadEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await warehouseApi.listEquipment();
      setEquipment(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEquipment();
  }, [loadEquipment]);

  async function addEquipment() {
    if (!form.name.trim()) return;
    const created = await warehouseApi.createEquipment(form);
    setEquipment((prev) => [...prev, created]);
    setForm({ name: "", category: "", qty: 1, status: "operativo", location: "", value: 0 });
  }

  async function removeEquipment(id: string) {
    await warehouseApi.deleteEquipment(id);
    setEquipment((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
      <Card title="Nuova attrezzatura">
        <div className="space-y-3">
          <div><label className={LABEL}>Nome</label><input className={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="es. Forno combinato" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={LABEL}>Categoria</label><input className={INPUT} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Cucina, Bar…" /></div>
            <div><label className={LABEL}>Quantità</label><input type="number" min="1" className={INPUT} value={form.qty || ""} onChange={(e) => setForm({ ...form, qty: parseInt(e.target.value) || 1 })} placeholder="1" /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={LABEL}>Stato</label><select className={INPUT} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Equipment["status"] })}><option value="operativo">Operativo</option><option value="manutenzione">Manutenzione</option><option value="fuori uso">Fuori uso</option></select></div>
            <div><label className={LABEL}>Ubicazione</label><input className={INPUT} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Cucina, Sala…" /></div>
          </div>
          <div><label className={LABEL}>Valore (€)</label><input type="number" min="0" step="100" className={INPUT} value={form.value || ""} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} placeholder="0" /></div>
          <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={addEquipment}><Plus className="h-4 w-4" /> Aggiungi</button>
        </div>
      </Card>

      <Card title="Inventario attrezzature" description={`${equipment.length} elementi`}>
        {loading ? (
          <div className="py-8 text-center text-sm text-rw-muted">Caricamento attrezzature...</div>
        ) : null}
        <DataTable
          columns={[
            { key: "name", header: "Nome", render: (r: Equipment) => <span className="font-medium text-rw-ink">{r.name}</span> },
            { key: "category", header: "Categoria" },
            { key: "qty", header: "Qtà", render: (r: Equipment) => String(r.qty) },
            { key: "status", header: "Stato", render: (r: Equipment) => <span className={cn("inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase", statusColors[r.status])}>{r.status}</span> },
            { key: "location", header: "Ubicazione" },
            { key: "value", header: "Valore", render: (r: Equipment) => `€ ${r.value.toLocaleString("it-IT")}` },
            { key: "actions", header: "", render: (r: Equipment) => <button type="button" onClick={() => removeEquipment(r.id)} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button> },
          ]}
          data={equipment}
          keyExtractor={(r) => r.id}
          emptyMessage="Nessuna attrezzatura registrata"
        />
      </Card>
    </div>
  );
}
