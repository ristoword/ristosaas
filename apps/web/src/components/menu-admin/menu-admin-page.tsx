"use client";

import { useState } from "react";
import {
  BookOpen,
  Calculator,
  CalendarDays,
  Edit2,
  Loader2,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { Modal } from "@/components/shared/modal";
import { useMenu } from "@/components/menu/menu-context";
import type { MenuItem } from "@/components/menu/menu-context";

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

const CATEGORIES = ["Pizze", "Primi", "Secondi", "Antipasti", "Contorni", "Dolci", "Bevande"];
const FILTER_CATS = ["Tutti", ...CATEGORIES];

export function MenuAdminPage() {
  const { menuItems, removeMenuItem, addMenuItem, updateMenuItem, addDailyFromMenuItem, recipes } = useMenu();
  const [filterCat, setFilterCat] = useState("Tutti");
  const [filterSearch, setFilterSearch] = useState("");

  // ── form nuovo piatto ─────────────────────────
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Primi");
  const [newArea, setNewArea] = useState("cucina");
  const [newPrice, setNewPrice] = useState(0);
  const [newCode, setNewCode] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [newNotes, setNewNotes] = useState("");

  // ── modifica piatto ───────────────────────────
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFlash, setEditFlash] = useState<string | null>(null);

  // ── flash trasferimento ───────────────────────
  const [transferFlash, setTransferFlash] = useState<string | null>(null);

  const filtered = menuItems.filter((d) => {
    const itemArea = (d.area || "").toLowerCase();
    if (filterCat !== "Tutti" && d.category !== filterCat) return false;
    if (filterSearch && !d.name.toLowerCase().includes(filterSearch.toLowerCase()) && !itemArea.includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  async function handleAddDish(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await addMenuItem({
      name: newName,
      category: newCategory,
      area: newArea,
      price: newPrice,
      code: newCode,
      active: newActive,
      recipeId: null,
      notes: newNotes,
      foodCostPct: null,
    });
    setNewName(""); setNewPrice(0); setNewCode(""); setNewNotes("");
  }

  function openEdit(item: MenuItem) {
    setEditItem({ ...item });
    setEditError(null);
    setEditFlash(null);
  }

  async function handleSaveEdit() {
    if (!editItem) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await updateMenuItem(editItem.id, {
        name: editItem.name,
        category: editItem.category,
        area: editItem.area,
        price: editItem.price,
        code: editItem.code,
        active: editItem.active,
        notes: editItem.notes,
        foodCostPct: editItem.foodCostPct,
      });
      setEditFlash(`"${editItem.name}" aggiornato.`);
      setEditItem(null);
      setTimeout(() => setEditFlash(null), 3000);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Errore salvataggio");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleAddToDaily(item: MenuItem) {
    try {
      await addDailyFromMenuItem(item);
      setTransferFlash(`"${item.name}" aggiunto al Menu del Giorno.`);
      setTimeout(() => setTransferFlash(null), 3000);
    } catch (e) {
      setTransferFlash(`Errore: ${e instanceof Error ? e.message : "Impossibile aggiungere al menu del giorno"}`);
      setTimeout(() => setTransferFlash(null), 4000);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Gestione Menu" subtitle="Anagrafica piatti e food cost">
        <button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-4 py-2 text-sm font-semibold text-rw-soft hover:text-rw-ink">
          <Printer className="h-4 w-4" /> Stampa Menu
        </button>
      </PageHeader>

      <div className="flex flex-wrap gap-3 print:hidden">
        <Chip label="Piatti totali" value={menuItems.length} tone="default" />
        <Chip label="Attivi" value={menuItems.filter((d) => d.active).length} tone="success" />
        <Chip label="Categorie" value={new Set(menuItems.map((d) => d.category)).size} tone="info" />
        {recipes.length > 0 && (
          <Chip label="Ricette disponibili" value={recipes.length} tone="accent" />
        )}
      </div>

      {editFlash && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 print:hidden">
          {editFlash}
        </div>
      )}
      {transferFlash && (
        <div className={cn(
          "rounded-xl border px-4 py-3 text-sm font-semibold print:hidden",
          transferFlash.startsWith("Errore")
            ? "border-red-500/30 bg-red-500/10 text-red-300"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        )}>
          {transferFlash}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr] print:grid-cols-1">
        {/* Left: New dish form */}
        <div className="space-y-4 print:hidden">
          <Card title="Nuovo piatto" headerRight={<BookOpen className="h-4 w-4 text-rw-accent" />}>
            <form className="space-y-3" onSubmit={(e) => void handleAddDish(e)}>
              <div>
                <label className={labelCls}>Nome</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome del piatto" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Categoria</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className={inputCls}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Area</label>
                  <select value={newArea} onChange={(e) => setNewArea(e.target.value)} className={inputCls}>
                    <option value="cucina">Cucina</option>
                    <option value="pizzeria">Pizzeria</option>
                    <option value="bar">Bar</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Prezzo (€)</label>
                  <input type="number" step="0.50" min={0} value={newPrice || ""} onChange={(e) => setNewPrice(Number(e.target.value))} placeholder="0.00" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Codice</label>
                  <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="PZ01" className={inputCls} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" checked={newActive} onChange={(e) => setNewActive(e.target.checked)} className="peer sr-only" />
                  <div className="h-6 w-11 rounded-full bg-rw-surfaceAlt peer-checked:bg-rw-accent after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-rw-line after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                </label>
                <span className="text-sm text-rw-soft">Attivo</span>
              </div>
              <div>
                <label className={labelCls}>Note</label>
                <textarea rows={2} value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Allergeni, varianti..." className={cn(inputCls, "resize-y")} />
              </div>
              <button type="submit" className={cn(btnPrimary, "w-full")}>
                <Plus className="h-4 w-4" /> Salva piatto
              </button>
            </form>
          </Card>
        </div>

        {/* Right: Dishes list */}
        <Card
          title="Piatti registrati"
          description={`${filtered.length} piatti`}
          headerRight={<Calculator className="h-4 w-4 text-rw-muted" />}
        >
          <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
            <div className="flex-1 min-w-[180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                <input type="text" placeholder="Cerca piatto..." className={cn(inputCls, "pl-9")} value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
              </div>
            </div>
            <div>
              <select className={inputCls} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
                {FILTER_CATS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="hidden rounded-t-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-rw-muted sm:grid sm:grid-cols-[1fr_90px_80px_70px_50px_auto] print:grid print:grid-cols-[1fr_100px_80px]">
            <span>Nome</span>
            <span>Categoria</span>
            <span className="text-right">Prezzo</span>
            <span className="text-center print:hidden">FC%</span>
            <span className="text-center print:hidden">Stato</span>
            <span className="print:hidden" />
          </div>

          <div className="space-y-0">
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-rw-muted">Nessun piatto trovato.</p>
            )}
            {filtered.map((d) => (
              <div key={d.id} className="flex flex-col gap-2 border-x border-b border-rw-line px-4 py-3 transition hover:bg-rw-surfaceAlt/50 sm:grid sm:grid-cols-[1fr_90px_80px_70px_50px_auto] sm:items-center sm:gap-0 print:grid print:grid-cols-[1fr_100px_80px]">
                <div>
                  <p className="font-semibold text-rw-ink">{d.name}</p>
                  <p className="text-xs text-rw-muted">{d.category} · {d.area}</p>
                  {d.recipeId && <p className="text-[10px] text-rw-accent">da ricetta</p>}
                </div>
                <span className="hidden text-sm text-rw-soft sm:block">{d.category}</span>
                <span className="text-sm font-medium text-rw-ink sm:text-right">€{d.price.toFixed(2)}</span>
                <span className="hidden text-sm text-rw-soft sm:block sm:text-center print:hidden">
                  {d.foodCostPct != null ? `${d.foodCostPct}%` : "—"}
                </span>
                <span className="sm:text-center print:hidden">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    d.active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400",
                  )}>
                    {d.active ? "On" : "Off"}
                  </span>
                </span>
                {/* Azioni */}
                <span className="flex items-center gap-1.5 print:hidden">
                  <button
                    type="button"
                    title="Aggiungi al Menu del Giorno"
                    onClick={() => void handleAddToDaily(d)}
                    className="flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-400 hover:bg-sky-500/20 transition"
                  >
                    <CalendarDays className="h-3 w-3" />
                    Giorno
                  </button>
                  <button
                    type="button"
                    title="Modifica piatto"
                    onClick={() => openEdit(d)}
                    className="rounded-lg border border-rw-line p-1.5 text-rw-muted hover:text-rw-accent transition"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Elimina piatto"
                    onClick={() => void removeMenuItem(d.id)}
                    className="rounded-lg border border-red-500/20 p-1.5 text-red-400 hover:bg-red-500/10 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Print view */}
      <div className="hidden print:block">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Menu</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString("it-IT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        {CATEGORIES.map((cat) => {
          const items = menuItems.filter((d) => d.category === cat && d.active);
          if (items.length === 0) return null;
          return (
            <div key={cat} className="mb-4">
              <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-2">{cat}</h2>
              {items.map((d) => (
                <div key={d.id} className="flex justify-between py-1">
                  <div>
                    <span className="font-medium">{d.name}</span>
                    {d.notes && <span className="text-xs text-gray-500 ml-2">({d.notes})</span>}
                  </div>
                  <span className="font-semibold">€{d.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Modal: modifica piatto */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={`Modifica — ${editItem?.name ?? ""}`}>
        {editItem && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Nome</label>
              <input type="text" className={inputCls} value={editItem.name} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Categoria</label>
                <select className={inputCls} value={editItem.category} onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Area</label>
                <select className={inputCls} value={(editItem.area || "cucina").toLowerCase()} onChange={(e) => setEditItem({ ...editItem, area: e.target.value })}>
                  <option value="cucina">Cucina</option>
                  <option value="pizzeria">Pizzeria</option>
                  <option value="bar">Bar</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Prezzo (€)</label>
                <input type="number" step="0.50" min={0} className={inputCls} value={editItem.price || ""} onChange={(e) => setEditItem({ ...editItem, price: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelCls}>Codice</label>
                <input type="text" className={inputCls} value={editItem.code} onChange={(e) => setEditItem({ ...editItem, code: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" checked={editItem.active} onChange={(e) => setEditItem({ ...editItem, active: e.target.checked })} className="peer sr-only" />
                <div className="h-6 w-11 rounded-full bg-rw-surfaceAlt peer-checked:bg-rw-accent after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-rw-line after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
              </label>
              <span className="text-sm text-rw-soft">Attivo</span>
            </div>
            <div>
              <label className={labelCls}>Note</label>
              <textarea rows={2} className={cn(inputCls, "resize-y")} value={editItem.notes} onChange={(e) => setEditItem({ ...editItem, notes: e.target.value })} placeholder="Allergeni, varianti..." />
            </div>
            {editError && <p className="text-xs text-red-400">{editError}</p>}
            <div className="flex gap-3">
              <button type="button" className={cn(btnPrimary, "flex-1")} onClick={() => void handleSaveEdit()} disabled={editSaving}>
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editSaving ? "Salvataggio…" : "Salva modifiche"}
              </button>
              <button type="button" onClick={() => setEditItem(null)} className="flex items-center gap-1.5 rounded-xl border border-rw-line px-4 py-2.5 text-sm text-rw-muted hover:text-rw-ink">
                <X className="h-4 w-4" /> Annulla
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
