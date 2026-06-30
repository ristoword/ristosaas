"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { AlertTriangle, ArrowDownUp, ArrowLeftRight, CalendarClock, ChevronDown, ChevronUp, Download, Edit2, Loader2, Minus, Package, Plus, Save, Search, ShoppingCart, Sparkles, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
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
  WAREHOUSE_DEPARTMENTS,
  WAREHOUSE_LOCATION_LABELS,
  type WarehouseLocation,
} from "@/lib/api/types/warehouse";
import { BollaAiImportPanel } from "@/components/magazzino/bolla-ai-import-panel";

type ShoppingItem = { id: string; product: string; qty: number; unit: string; supplier: string; done: boolean };

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
    window.alert(e instanceof Error ? e.message : "Unable to save voice command.");
  }
}

export function MagazzinoPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("centrale");
  const [aiOpen, setAiOpen] = useState(false);
  const { stock, totalStockValue, lowStockItems, movements } = useWarehouse();

  const stockVal = totalStockValue();
  const lowItems = lowStockItems();

  return (
    <div className="space-y-6">
      <PageHeader title={t("magazzino.title")} subtitle={t("magazzino.subtitle")}>
        <Chip label={t("magazzino.chip.products")} value={stock.length} tone="info" />
        <Chip label={t("magazzino.chip.lowStock")} value={lowItems.length} tone={lowItems.length > 0 ? "danger" : "default"} />
        <Chip label={t("magazzino.chip.totalValue")} value={`€ ${stockVal.toFixed(2)}`} tone="accent" />
        <VoiceButton onResult={(text) => void persistWarehouseVoice(text)} />
        <AiToggleButton onClick={() => setAiOpen(true)} label={t("magazzino.ai.label")} />
      </PageHeader>

      <TabBar tabs={[
        { id: "centrale", label: t("magazzino.tab.centrale") },
        { id: "reparti", label: t("magazzino.tab.reparti") },
        { id: "ricezione", label: t("magazzino.tab.ricezione") },
        { id: "movimenti", label: t("magazzino.tab.movimenti") },
        { id: "lista-spesa", label: t("magazzino.tab.listaspesa") },
        { id: "attrezzature", label: t("magazzino.tab.attrezzature") },
      ]} active={tab} onChange={setTab} />

      {tab === "centrale" && <CentraleTab />}
      {tab === "reparti" && <RepartiTab />}
      {tab === "ricezione" && <RicezioneTab />}
      {tab === "movimenti" && <MovimentiTab />}
      {tab === "lista-spesa" && <ListaSpesaTab />}
      {tab === "attrezzature" && <AttrezzatureTab />}

      <AiChat context="magazzino" open={aiOpen} onClose={() => setAiOpen(false)} title={t("magazzino.ai.label")} />
    </div>
  );
}

type ProductForm = {
  name: string; category: string; qty: number; unit: string;
  minStock: number; costPerUnit: number; supplier: string;
  lotNumber: string; expiryDate: string;
};

const EMPTY_FORM: ProductForm = {
  name: "", category: "", qty: 0, unit: "kg",
  minStock: 0, costPerUnit: 0, supplier: "",
  lotNumber: "", expiryDate: "",
};

const UNITS = ["kg", "g", "L", "mL", "pz", "bt", "ct", "lt", "m", "cm"];

function CentraleTab() {
  const { t, locale } = useI18n();
  const { stock, addStock, refresh } = useWarehouse();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);

  // Modal modifica prodotto
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal aggiustamento scorte rapido (+/-)
  const [adjItem, setAdjItem] = useState<StockItem | null>(null);
  const [adjMode, setAdjMode] = useState<"add" | "remove">("add");
  const [adjQty, setAdjQty] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjSaving, setAdjSaving] = useState(false);
  const [adjError, setAdjError] = useState<string | null>(null);

  const [flash, setFlash] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(
    () => stock.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier.toLowerCase().includes(search.toLowerCase()) ||
      (p.lotNumber ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [stock, search],
  );

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3500);
  }

  async function handleAdd() {
    if (!form.name.trim()) return;
    try {
      await addStock({
        ...form,
        lotNumber: form.lotNumber || null,
        expiryDate: form.expiryDate || null,
      } as any);
      setForm(EMPTY_FORM);
      showFlash(`"${form.name}" aggiunto al magazzino.`);
    } catch (e) {
      showFlash(e instanceof Error ? e.message : "Errore aggiunta prodotto");
    }
  }

  // Apertura modifica
  function openEdit(item: StockItem) {
    setEditItem(item);
    setEditForm({
      name: item.name,
      category: item.category,
      qty: item.qty,
      unit: item.unit,
      minStock: item.minStock,
      costPerUnit: item.costPerUnit,
      supplier: item.supplier,
      lotNumber: item.lotNumber ?? "",
      expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : "",
    });
    setEditError(null);
  }

  // Salvataggio modifica
  async function handleEditSave() {
    if (!editItem) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await warehouseApi.update(editItem.id, {
        name: editForm.name.trim(),
        category: editForm.category.trim(),
        qty: editForm.qty,
        unit: editForm.unit,
        minStock: editForm.minStock,
        costPerUnit: editForm.costPerUnit,
        supplier: editForm.supplier.trim(),
        lotNumber: editForm.lotNumber.trim() || null,
        expiryDate: editForm.expiryDate || null,
      } as any);
      await refresh();
      setEditItem(null);
      showFlash(`"${editForm.name}" aggiornato.`);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : t("magazzino.central.saveError"));
    } finally {
      setEditSaving(false);
    }
  }

  // Apertura aggiustamento scorte
  function openAdj(item: StockItem, mode: "add" | "remove") {
    setAdjItem(item);
    setAdjMode(mode);
    setAdjQty("");
    setAdjReason(mode === "add" ? "Carico manuale" : "Scarico manuale");
    setAdjError(null);
  }

  // Salvataggio aggiustamento scorte
  async function handleAdjSave() {
    if (!adjItem) return;
    const qty = parseFloat(adjQty.replace(",", "."));
    if (isNaN(qty) || qty <= 0) { setAdjError(t("ui.invalidQty")); return; }
    setAdjSaving(true);
    setAdjError(null);
    try {
      await warehouseApi.createMovement({
        warehouseItemId: adjItem.id,
        type: adjMode === "add" ? "carico" : "scarico",
        qty,
        reason: adjReason.trim() || (adjMode === "add" ? "Carico manuale" : "Scarico manuale"),
        toLocation: adjMode === "add" ? "MAGAZZINO_CENTRALE" : undefined,
        fromLocation: adjMode === "remove" ? "MAGAZZINO_CENTRALE" : undefined,
      });
      await refresh();
      setAdjItem(null);
      showFlash(`${adjMode === "add" ? "+" : "-"}${qty} ${adjItem.unit} di "${adjItem.name}" registrati.`);
    } catch (e) {
      setAdjError(e instanceof Error ? e.message : "Errore");
    } finally {
      setAdjSaving(false);
    }
  }

  // Elimina prodotto
  async function handleDelete(id: string, name: string) {
    try {
      await warehouseApi.delete(id);
      await refresh();
      setDeleteId(null);
      showFlash(`"${name}" eliminato dal magazzino.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : t("magazzino.central.deleteError"));
    }
  }

  // Expiry color
  function expiryTone(dateStr?: string | null) {
    if (!dateStr) return null;
    const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return "text-red-400 font-semibold";
    if (diff <= 7) return "text-orange-400 font-semibold";
    if (diff <= 30) return "text-amber-400";
    return "text-rw-muted";
  }

  return (
    <div className="space-y-6">
      {flash && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
          {flash}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
        {/* Form nuovo prodotto */}
        <Card
          title={t("magazzino.central.newProduct")}
          description={t("magazzino.central.voiceDesc")}
          headerRight={
            <VoiceButton compact onResult={(text) => {
              setForm((f) => ({ ...f, name: text }));
              void persistWarehouseVoice(text);
            }} />
          }
        >
          <div className="space-y-3">
            <div><label className={LABEL}>{t("magazzino.central.productName")}</label><input className={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="es. Farina Manitoba" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={LABEL}>{t("magazzino.central.category")}</label><input className={INPUT} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Secchi, Latticini…" /></div>
              <div>
                <label className={LABEL}>{t("magazzino.central.unit")}</label>
                <div className="relative">
                  <select className={cn(INPUT, "appearance-none pr-8")} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={LABEL}>{t("magazzino.central.initialQty")}</label><input type="number" min="0" step="0.001" className={INPUT} value={form.qty || ""} onChange={(e) => setForm({ ...form, qty: parseFloat(e.target.value) || 0 })} placeholder="0" /></div>
              <div><label className={LABEL}>{t("magazzino.scorta.minima")}</label><input type="number" min="0" step="0.001" className={INPUT} value={form.minStock || ""} onChange={(e) => setForm({ ...form, minStock: parseFloat(e.target.value) || 0 })} placeholder="0" /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={LABEL}>{t("magazzino.central.unitCost")}</label><input type="number" min="0" step="0.01" className={INPUT} value={form.costPerUnit || ""} onChange={(e) => setForm({ ...form, costPerUnit: parseFloat(e.target.value) || 0 })} placeholder="0.00" /></div>
              <div><label className={LABEL}>{t("magazzino.central.supplier")}</label><input className={INPUT} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Nome fornitore" /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={LABEL}>{t("magazzino.central.lotNumber")}</label><input className={INPUT} value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} placeholder="es. LOT-2025-001" /></div>
              <div><label className={LABEL}>{t("magazzino.central.expiryDate")}</label><input type="date" className={INPUT} value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></div>
            </div>
            <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={handleAdd}><Plus className="h-4 w-4" /> {t("magazzino.central.addProduct")}</button>
          </div>
        </Card>

        {/* Inventario con edit + +/- */}
        <Card
          title={t("magazzino.central.inventoryTitle")}
          description={`${filtered.length} ${t("magazzino.chip.products").toLowerCase()}`}
          headerRight={
            <div className="relative w-52">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
              <input className={cn(INPUT, "pl-9")} placeholder={t("ui.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          }
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-rw-muted">
              <Package className="h-8 w-8 opacity-40" />
              <p className="text-sm">{t("magazzino.central.notFound")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("magazzino.col.product")}</th>
                    <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("magazzino.col.qty")}</th>
                    <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("magazzino.col.unitCost")}</th>
                    <th className="px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("magazzino.col.lot")}</th>
                    <th className="px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("magazzino.col.expiry")}</th>
                    <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("magazzino.col.stock")}</th>
                    <th className="w-10 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const sottoScorta = item.qty <= item.minStock;
                    const scadTone = expiryTone(item.expiryDate);
                    return (
                      <tr key={item.id} className="group border-b border-rw-line/40 hover:bg-rw-surfaceAlt/40">
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-rw-ink">{item.name}</div>
                          <div className="text-xs text-rw-muted">{item.category}{item.supplier ? ` · ${item.supplier}` : ""}</div>
                          {sottoScorta && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-400 mt-0.5">
                              <AlertTriangle className="h-3 w-3" /> {t("magazzino.lowStock")}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums font-semibold text-rw-ink whitespace-nowrap">
                          {item.qty.toFixed(3)} <span className="text-xs text-rw-muted">{item.unit}</span>
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-rw-soft">€{item.costPerUnit.toFixed(2)}</td>
                        <td className="px-2 py-2.5 text-xs text-rw-soft font-mono">{item.lotNumber || "—"}</td>
                        <td className={cn("px-2 py-2.5 text-xs whitespace-nowrap", scadTone ?? "text-rw-muted")}>
                          {item.expiryDate
                            ? <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{new Date(item.expiryDate).toLocaleDateString("it-IT")}</span>
                            : "—"
                          }
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              title={`Aumenta scorte di ${item.name}`}
                              onClick={() => openAdj(item, "add")}
                              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-1.5 text-emerald-400 hover:bg-emerald-500/20 transition"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title={`Diminuisci scorte di ${item.name}`}
                              onClick={() => openAdj(item, "remove")}
                              className="rounded-lg border border-red-500/30 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 transition"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button type="button" title="Modifica prodotto" onClick={() => openEdit(item)} className="rounded-lg border border-rw-line p-1.5 text-rw-muted hover:text-rw-accent transition">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" title="Elimina prodotto" onClick={() => setDeleteId(item.id)} className="rounded-lg border border-red-500/20 p-1.5 text-red-400 hover:bg-red-500/10 transition">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Modal MODIFICA PRODOTTO */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={`${t("ui.edit")} — ${editItem?.name ?? ""}`} wide>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={LABEL}>{t("magazzino.central.productName")}</label><input className={INPUT} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><label className={LABEL}>{t("magazzino.central.category")}</label><input className={INPUT} value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className={LABEL}>{t("magazzino.central.currentQty")}</label><input type="number" min="0" step="0.001" className={INPUT} value={editForm.qty || ""} onChange={(e) => setEditForm({ ...editForm, qty: parseFloat(e.target.value) || 0 })} /></div>
            <div>
              <label className={LABEL}>{t("magazzino.central.unit")}</label>
              <div className="relative">
                <select className={cn(INPUT, "appearance-none pr-8")} value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
              </div>
            </div>
            <div><label className={LABEL}>{t("magazzino.scorta.minima")}</label><input type="number" min="0" step="0.001" className={INPUT} value={editForm.minStock || ""} onChange={(e) => setEditForm({ ...editForm, minStock: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={LABEL}>{t("magazzino.central.unitCost")}</label><input type="number" min="0" step="0.01" className={INPUT} value={editForm.costPerUnit || ""} onChange={(e) => setEditForm({ ...editForm, costPerUnit: parseFloat(e.target.value) || 0 })} /></div>
            <div><label className={LABEL}>{t("magazzino.central.supplier")}</label><input className={INPUT} value={editForm.supplier} onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-rw-accent/20 bg-rw-accent/5 p-3">
            <div>
              <label className={cn(LABEL, "text-rw-accent")}>{t("magazzino.central.lotNumber")}</label>
              <input className={INPUT} value={editForm.lotNumber} onChange={(e) => setEditForm({ ...editForm, lotNumber: e.target.value })} placeholder="es. LOT-2025-001" />
            </div>
            <div>
              <label className={cn(LABEL, "text-rw-accent")}>{t("magazzino.central.expiryDate")}</label>
              <input type="date" className={INPUT} value={editForm.expiryDate} onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })} />
            </div>
          </div>
          {editError && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{editError}</p>}
          <div className="flex gap-3">
            <button type="button" className={cn(BTN_PRIMARY, "flex-1")} onClick={() => void handleEditSave()} disabled={editSaving}>
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editSaving ? t("ui.saving") : t("magazzino.central.saveChanges")}
            </button>
            <button type="button" className="rounded-xl border border-rw-line px-4 py-2.5 text-sm font-semibold text-rw-muted hover:text-rw-ink" onClick={() => setEditItem(null)}>
              {t("ui.cancel")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal AGGIUSTAMENTO SCORTE +/- */}
      <Modal
        open={!!adjItem}
        onClose={() => setAdjItem(null)}
        title={adjMode === "add" ? `${t("magazzino.adj.add")} — ${adjItem?.name}` : `${t("magazzino.adj.remove")} — ${adjItem?.name}`}
      >
        <div className="space-y-4">
          {adjItem && (
            <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm">
              <span className="text-rw-muted">{t("magazzino.adj.current")}: </span>
              <span className="font-bold text-rw-ink">{adjItem.qty.toFixed(3)} {adjItem.unit}</span>
              {adjItem.lotNumber && <span className="ml-3 text-xs text-rw-muted">Lotto: {adjItem.lotNumber}</span>}
            </div>
          )}
          <div>
            <label className={LABEL}>
              {adjMode === "add"
                ? <span className="text-emerald-400">{t("magazzino.adj.addQty")} ({adjItem?.unit})</span>
                : <span className="text-red-400">{t("magazzino.adj.removeQty")} ({adjItem?.unit})</span>
              }
            </label>
            <div className="flex items-center gap-3">
              {adjMode === "add"
                ? <ChevronUp className="h-5 w-5 text-emerald-400 shrink-0" />
                : <ChevronDown className="h-5 w-5 text-red-400 shrink-0" />
              }
              <input
                type="number"
                min="0"
                step="0.001"
                autoFocus
                className={cn(INPUT, "text-lg font-bold")}
                value={adjQty}
                onChange={(e) => setAdjQty(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className={LABEL}>{t("magazzino.adj.reason")}</label>
            <input className={INPUT} value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="es. Ricezione fornitore, scarico manuale…" />
          </div>
          {adjError && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{adjError}</p>}
          <button
            type="button"
            className={cn(
              "w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition",
              adjMode === "add" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"
            )}
            onClick={() => void handleAdjSave()}
            disabled={adjSaving || !adjQty}
          >
            {adjSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : adjMode === "add" ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            {adjSaving ? t("magazzino.adj.saving") : adjMode === "add" ? t("magazzino.adj.add") : t("magazzino.adj.remove")}
          </button>
        </div>
      </Modal>

      {/* Modal CONFERMA ELIMINAZIONE */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title={t("magazzino.delete.confirm")}>
        <div className="space-y-4">
          <p className="text-sm text-rw-soft">
            Sei sicuro di voler eliminare <strong className="text-rw-ink">{stock.find((s) => s.id === deleteId)?.name}</strong>?
            {t("magazzino.delete.movementsNote")}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
              onClick={() => {
                const item = stock.find((s) => s.id === deleteId);
                if (item) void handleDelete(item.id, item.name);
              }}
            >
              <Trash2 className="h-4 w-4" /> {t("ui.delete")}
            </button>
            <button type="button" className="rounded-xl border border-rw-line px-4 py-2.5 text-sm font-semibold text-rw-muted hover:text-rw-ink" onClick={() => setDeleteId(null)}>
              {t("ui.cancel")}
            </button>
          </div>
        </div>
      </Modal>
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
  CANTINA: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  SALA: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  PROPRIETA: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  ALTRO: "bg-rw-surfaceAlt text-rw-muted border-rw-line",
};

function RepartiTab() {
  const { t } = useI18n();
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
    if (isNaN(qty) || qty <= 0) { setError(t("ui.invalidQty")); return; }
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
          {t("magazzino.reparti.desc")}
        </p>
        <button
          type="button"
          onClick={() => setTransferOpen(true)}
          className={cn(BTN_PRIMARY, "gap-2")}
        >
          <ArrowLeftRight className="h-4 w-4" />
          {t("magazzino.reparti.newTransfer")}
        </button>
      </div>

      {itemsWithDept.length === 0 ? (
        <Card title={t("magazzino.reparti.noStock")}>
          <p className="py-4 text-sm text-rw-muted text-center">
            {t("magazzino.reparti.noStockDesc")}
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-rw-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("magazzino.col.product")}</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("magazzino.reparti.centrale")}</th>
                {WAREHOUSE_DEPARTMENTS.map((loc) => (
                  <th key={loc} className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">
                    {WAREHOUSE_LOCATION_LABELS[loc]}
                  </th>
                ))}
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-rw-accent">{t("ui.total")}</th>
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
                    {WAREHOUSE_DEPARTMENTS.map((loc) => {
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

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title={t("magazzino.transfer.title")}>
        <div className="space-y-4">
          <div>
            <label className={LABEL}>{t("magazzino.col.product")}</label>
            <select
              className={INPUT}
              value={form.warehouseItemId}
              onChange={(e) => setForm((f) => ({ ...f, warehouseItemId: e.target.value }))}
            >
              <option value="">{t("ui.select")}…</option>
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
              <label className={LABEL}>{t("magazzino.transfer.from")}</label>
              <select className={INPUT} value={form.fromLocation} onChange={(e) => setForm((f) => ({ ...f, fromLocation: e.target.value as WarehouseLocation }))}>
                {WAREHOUSE_LOCATIONS.map((l) => (
                  <option key={l} value={l}>{WAREHOUSE_LOCATION_LABELS[l]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>{t("magazzino.transfer.to")}</label>
              <select className={INPUT} value={form.toLocation} onChange={(e) => setForm((f) => ({ ...f, toLocation: e.target.value as WarehouseLocation }))}>
                {WAREHOUSE_LOCATIONS.map((l) => (
                  <option key={l} value={l}>{WAREHOUSE_LOCATION_LABELS[l]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>{t("magazzino.col.qty")}</label>
            <input type="number" min="0" step="0.001" className={INPUT} value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} placeholder="0" />
          </div>
          <div>
            <label className={LABEL}>{t("magazzino.transfer.reason")}</label>
            <input className={INPUT} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="es. Rifornimento cucina" />
          </div>
          <div>
            <label className={LABEL}>{t("magazzino.transfer.note")}</label>
            <input className={INPUT} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Note aggiuntive…" />
          </div>
          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={() => void handleTransfer()} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
            {sending ? t("magazzino.transfer.saving") : t("magazzino.transfer.confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function RicezioneTab() {
  const { t } = useI18n();
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

  async function handleRegister() {
    if (!selectedProduct || !qty) return;
    try {
      await loadStock(selectedProduct, parseFloat(qty), "Ricezione merce");
      setFlash(`Caricato ${qty} unità di ${stock.find((s) => s.id === selectedProduct)?.name}`);
      setSelectedProduct(""); setQty("");
      setTimeout(() => setFlash(null), 3000);
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Errore registrazione merce");
      setTimeout(() => setFlash(null), 3000);
    }
  }

  return (
    <div className="space-y-4">
      <BollaAiImportPanel />
      {flash && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">{flash}</div>}
      <Card title={t("magazzino.reception.title")} description={t("magazzino.central.voiceDesc")} headerRight={<VoiceButton onResult={handleVoice} compact />}>
        <div className="space-y-3">
          <div><label className={LABEL}>{t("magazzino.col.product")}</label><select className={INPUT} value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}><option value="">{t("ui.select")}…</option>{stock.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.qty} {s.unit})</option>)}</select></div>
          <div><label className={LABEL}>{t("magazzino.reception.qty")}</label><input type="number" min="0" className={INPUT} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" /></div>
          <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={handleRegister}><Download className="h-4 w-4" /> {t("magazzino.reception.register")}</button>
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
  const { t } = useI18n();
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
    if (!form.warehouseItemId) { setError(t("ui.selectProduct")); return; }
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
      setFlash(t("magazzino.movements.updated"));
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
        <p className="text-sm text-rw-muted">{movements.length} {t("magazzino.movements.countLabel")}</p>
        <button type="button" className={cn(BTN_PRIMARY, "gap-2")} onClick={openCreate}>
          <Plus className="h-4 w-4" /> {t("magazzino.movements.new")}
        </button>
      </div>

      {movements.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-rw-muted">
          <ArrowDownUp className="h-10 w-10 opacity-40" />
          <p className="text-sm">{t("magazzino.movements.empty")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-rw-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("ui.date")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("magazzino.col.product")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("magazzino.movements.type")}</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("magazzino.col.qty")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("magazzino.movements.fromTo")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("magazzino.movements.reason")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("ui.notes")}</th>
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
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t("magazzino.movements.modal.new")} wide>
        <div className="space-y-4">
          <div>
            <label className={LABEL}>{t("magazzino.col.product")} *</label>
            <select className={INPUT} value={form.warehouseItemId} onChange={(e) => setForm((f) => ({ ...f, warehouseItemId: e.target.value }))}>
              <option value="">— {t("ui.select")} {t("magazzino.col.product")} —</option>
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
            <label className={LABEL}>{t("magazzino.movements.type")} *</label>
            <select className={INPUT} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof f.type }))}>
              <option value="carico">{t("magazzino.movements.type")} — carico</option>
              <option value="scarico">Scarico (uscita da un reparto o dal centrale)</option>
              <option value="trasferimento">Trasferimento (da un reparto a un altro)</option>
              <option value="rettifica">Rettifica (imposta quantità esatta)</option>
            </select>
          </div>

          {form.type === "rettifica" ? (
            <div>
              <label className={LABEL}>{t("magazzino.movements.newAbsQty")}</label>
              <input type="number" min="0" step="0.001" className={INPUT} value={form.newQty} onChange={(e) => setForm((f) => ({ ...f, newQty: e.target.value }))} placeholder="es. 45.5" />
            </div>
          ) : (
            <div>
              <label className={LABEL}>{t("magazzino.col.qty")} *</label>
              <input type="number" min="0" step="0.001" className={INPUT} value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} placeholder="es. 10" />
            </div>
          )}

          {showFromLocation && (
            <div>
              <label className={LABEL}>{form.type === "rettifica" ? t("magazzino.movements.rectifyDept") : t("magazzino.movements.fromDept")}</label>
              <select className={INPUT} value={form.fromLocation} onChange={(e) => setForm((f) => ({ ...f, fromLocation: e.target.value as WarehouseLocation }))}>
                {WAREHOUSE_LOCATIONS.map((l) => (
                  <option key={l} value={l}>{WAREHOUSE_LOCATION_LABELS[l]}</option>
                ))}
              </select>
            </div>
          )}

          {showToLocation && (
            <div>
              <label className={LABEL}>{t("magazzino.movements.toDept")}</label>
              <select className={INPUT} value={form.toLocation} onChange={(e) => setForm((f) => ({ ...f, toLocation: e.target.value as WarehouseLocation }))}>
                {WAREHOUSE_LOCATIONS.map((l) => (
                  <option key={l} value={l}>{WAREHOUSE_LOCATION_LABELS[l]}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={LABEL}>{t("magazzino.movements.reason")}</label>
            <input className={INPUT} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder={`es. ${MOVEMENT_TYPE_LABELS[form.type]} manuale`} />
          </div>

          <div>
            <label className={LABEL}>{t("magazzino.transfer.note")}</label>
            <input className={INPUT} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Note aggiuntive…" />
          </div>

          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

          <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={() => void handleCreate()} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {sending ? t("ui.saving") : t("magazzino.movements.register")}
          </button>
        </div>
      </Modal>

      {/* Modal: Modifica Movimento */}
      <Modal open={!!editMovement} onClose={() => setEditMovement(null)} title={t("magazzino.movements.modal.edit")}>
        <div className="space-y-4">
          {editMovement && (
            <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-xs text-rw-muted space-y-1">
              <p><span className="font-semibold text-rw-soft">Prodotto:</span> {editMovement.productName}</p>
              <p><span className="font-semibold text-rw-soft">Tipo:</span> {MOVEMENT_TYPE_LABELS[editMovement.type] ?? editMovement.type}</p>
              <p><span className="font-semibold text-rw-soft">Quantità:</span> {editMovement.qty} {editMovement.unit}</p>
              <p className="text-[10px] text-rw-muted">{t("magazzino.movements.noRecalcNote")}</p>
            </div>
          )}
          <div>
            <label className={LABEL}>{t("magazzino.movements.reason")}</label>
            <input className={INPUT} value={editForm.reason} onChange={(e) => setEditForm((f) => ({ ...f, reason: e.target.value }))} />
          </div>
          <div>
            <label className={LABEL}>{t("ui.notes")}</label>
            <input className={INPUT} value={editForm.note} onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))} placeholder="Note aggiuntive…" />
          </div>
          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={() => void handleEdit()} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {sending ? t("ui.saving") : t("magazzino.central.saveChanges")}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function ListaSpesaTab() {
  const { t } = useI18n();
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
        <Card title={t("magazzino.shopping.addToList")} headerRight={<VoiceButton onResult={handleVoice} compact />}>
          <div className="space-y-3">
            <div><label className={LABEL}>{t("magazzino.col.product")}</label><input className={INPUT} value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Nome prodotto" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={LABEL}>{t("magazzino.col.qty")}</label><input type="number" min="0" className={INPUT} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" /></div>
              <div><label className={LABEL}>{t("magazzino.central.unit")}</label><select className={INPUT} value={unit} onChange={(e) => setUnit(e.target.value)}><option value="kg">kg</option><option value="L">L</option><option value="pz">pz</option><option value="bt">bt</option><option value="ct">ct</option></select></div>
            </div>
            <div><label className={LABEL}>{t("magazzino.central.supplier")}</label><input className={INPUT} value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Nome fornitore" /></div>
            <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={addItem}><Plus className="h-4 w-4" /> {t("ui.add")}</button>
          </div>
        </Card>

        {low.length > 0 && (
          <Card title={t("magazzino.shopping.aiSuggest")} description={`${low.length} ${t("magazzino.chip.lowStock").toLowerCase()}`} headerRight={<Sparkles className="h-4 w-4 text-rw-accent" />}>
            <div className="space-y-2">
              {low.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-rw-ink">{l.name}</p>
                    <p className="text-xs text-rw-muted">{l.qty} {l.unit} (min: {l.minStock}) — {l.supplier}</p>
                  </div>
                  <span className="text-xs font-bold text-red-400">{t("magazzino.shopping.reorder")}</span>
                </div>
              ))}
              <button type="button" onClick={autoFromLowStock} className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-4 py-2 text-xs font-semibold text-rw-accent hover:bg-rw-accent/20">
                <Sparkles className="h-3.5 w-3.5" /> {t("magazzino.shopping.addAll")}
              </button>
            </div>
          </Card>
        )}
      </div>

      <Card
        title={t("magazzino.shopping.title")}
        description={`${items.length} ${t("magazzino.chip.products").toLowerCase()}`}
        headerRight={
          <button
            type="button"
            onClick={() => setSuggestOpen(true)}
            className={cn(BTN_PRIMARY, "px-3 py-2 text-xs")}
            disabled={low.length === 0 && stock.length === 0}
          >
            <Sparkles className="h-3.5 w-3.5" /> {t("magazzino.shopping.suggestOrder")}
          </button>
        }
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-rw-muted"><ShoppingCart className="h-10 w-10 opacity-40" /><p className="text-sm">{t("magazzino.shopping.empty")}</p></div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className={cn("flex items-center justify-between rounded-xl border px-4 py-3 transition", item.done ? "border-emerald-500/30 bg-emerald-500/5 opacity-60" : "border-rw-line bg-rw-surfaceAlt")}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={item.done} onChange={() => toggleDone(item.id)} className="h-4 w-4 rounded border-rw-line text-rw-accent focus:ring-rw-accent" />
                  <div>
                    <p className={cn("text-sm font-medium", item.done ? "line-through text-rw-muted" : "text-rw-ink")}>{item.product}</p>
                    <p className="text-xs text-rw-muted">{item.qty} {item.unit} — {item.supplier || t("magazzino.shopping.noSupplier")}</p>
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
  const { t } = useI18n();
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
      title={t("magazzino.suggest.title")}
      subtitle={t("magazzino.suggest.subtitle")}
      wide
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className={LABEL}>{t("ui.status")}</label>
          <select
            className={INPUT}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            style={{ maxWidth: 180 }}
          >
            <option value="bozza">{t("ui.draft")}</option>
            <option value="inviato">{t("ui.sent")}</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-rw-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("magazzino.suggest.calculating")}
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
            {t("magazzino.suggest.noProducts")}
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
                    <option value="">{t("magazzino.suggest.selectSupplier")}</option>
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
                    {t("magazzino.suggest.createOrder")}
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
                        <p className="text-xs text-rw-muted">{t("magazzino.suggest.orderQty")}</p>
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
                        <p className="text-xs text-rw-muted">{t("magazzino.suggest.unitCost")}</p>
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
                        <p className="text-xs text-rw-muted">{t("magazzino.suggest.subtotal")}</p>
                        <p className="text-sm font-semibold text-rw-ink">€{lineTotal.toFixed(2)}</p>
                      </div>
                      <button
                        type="button"
                        aria-label={t("magazzino.suggest.removeRow")}
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
            {t("ui.close")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AttrezzatureTab() {
  const { t, locale } = useI18n();
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
    try {
      const created = await warehouseApi.createEquipment(form);
      setEquipment((prev) => [...prev, created]);
      setForm({ name: "", category: "", qty: 1, status: "operativo", location: "", value: 0 });
    } catch (e) {
      console.error("Failed to add equipment:", e);
    }
  }

  async function removeEquipment(id: string) {
    try {
      await warehouseApi.deleteEquipment(id);
      setEquipment((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      console.error("Failed to remove equipment:", e);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
      <Card title={t("magazzino.equipment.new")}>
        <div className="space-y-3">
          <div><label className={LABEL}>{t("ui.name")}</label><input className={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="es. Forno combinato" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={LABEL}>{t("magazzino.central.category")}</label><input className={INPUT} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Cucina, Bar…" /></div>
            <div><label className={LABEL}>{t("magazzino.col.qty")}</label><input type="number" min="1" className={INPUT} value={form.qty || ""} onChange={(e) => setForm({ ...form, qty: parseInt(e.target.value) || 1 })} placeholder="1" /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={LABEL}>{t("ui.status")}</label><select className={INPUT} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Equipment["status"] })}><option value="operativo">{t("magazzino.equipment.status.operativo")}</option><option value="manutenzione">{t("magazzino.equipment.status.manutenzione")}</option><option value="fuori uso">{t("magazzino.equipment.status.fuoriUso")}</option></select></div>
            <div><label className={LABEL}>{t("magazzino.equipment.location")}</label><input className={INPUT} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Cucina, Sala…" /></div>
          </div>
          <div><label className={LABEL}>{t("magazzino.equipment.value")}</label><input type="number" min="0" step="100" className={INPUT} value={form.value || ""} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} placeholder="0" /></div>
          <button type="button" className={cn(BTN_PRIMARY, "w-full")} onClick={addEquipment}><Plus className="h-4 w-4" /> {t("ui.add")}</button>
        </div>
      </Card>

      <Card title={t("magazzino.equipment.inventory")} description={`${equipment.length} ${t("magazzino.col.product").toLowerCase()}`}>
        {loading ? (
          <div className="py-8 text-center text-sm text-rw-muted">{t("magazzino.equipment.loading")}</div>
        ) : null}
        <DataTable
          columns={[
            { key: "name", header: t("ui.name"), render: (r: Equipment) => <span className="font-medium text-rw-ink">{r.name}</span> },
            { key: "category", header: t("magazzino.central.category") },
            { key: "qty", header: t("magazzino.col.qty"), render: (r: Equipment) => String(r.qty) },
            { key: "status", header: t("ui.status"), render: (r: Equipment) => <span className={cn("inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase", statusColors[r.status])}>{r.status}</span> },
            { key: "location", header: t("magazzino.equipment.location") },
            { key: "value", header: t("magazzino.equipment.value"), render: (r: Equipment) => `€ ${r.value.toLocaleString(locale)}` },
            { key: "actions", header: "", render: (r: Equipment) => <button type="button" onClick={() => removeEquipment(r.id)} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button> },
          ]}
          data={equipment}
          keyExtractor={(r) => r.id}
          emptyMessage={t("magazzino.equipment.empty")}
        />
      </Card>
    </div>
  );
}
