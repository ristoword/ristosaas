"use client";

import { useState } from "react";
import {
  Edit3,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { Modal } from "@/components/shared/modal";
import { useMenu } from "@/components/menu/menu-context";
import type { DailyDish } from "@/components/menu/menu-context";

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

const categoryOptions = ["Antipasti", "Primi", "Secondi", "Contorni", "Dolci"];

export function DailyMenuPage() {
  const { dailyDishes, addDailyDish, removeDailyDish, updateDailyDish, recipes } = useMenu();
  // Lo stato "menu attivo" e derivato dal numero di piatti del giorno presenti sul DB.
  // Quando l'utente vuole disattivare il menu, rimuove tutti i piatti (chiarezza UI reale).
  const menuActive = dailyDishes.length > 0;
  const [editDish, setEditDish] = useState<DailyDish | null>(null);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCat, setNewCat] = useState("Primi");
  const [newPrice, setNewPrice] = useState(0);
  const [newAllergens, setNewAllergens] = useState("");

  const grouped = categoryOptions
    .map((cat) => ({ category: cat, items: dailyDishes.filter((d) => d.category === cat) }))
    .filter((g) => g.items.length > 0);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    addDailyDish({ name: newName, description: newDesc, category: newCat, price: newPrice, allergens: newAllergens, recipeId: null });
    setNewName(""); setNewDesc(""); setNewPrice(0); setNewAllergens("");
  }

  function handlePrint() {
    window.print();
  }

  /* Edit modal state */
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCat, setEditCat] = useState("Primi");
  const [editPrice, setEditPrice] = useState(0);
  const [editAllergens, setEditAllergens] = useState("");

  function openEdit(d: DailyDish) {
    setEditDish(d);
    setEditName(d.name);
    setEditDesc(d.description);
    setEditCat(d.category);
    setEditPrice(d.price);
    setEditAllergens(d.allergens);
  }

  function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editDish) return;
    updateDailyDish(editDish.id, { name: editName, description: editDesc, category: editCat, price: editPrice, allergens: editAllergens });
    setEditDish(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Menu del Giorno" subtitle="Piatti speciali e proposte giornaliere">
        <button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-4 py-2 text-sm font-semibold text-rw-soft hover:text-rw-ink print:hidden">
          <Printer className="h-4 w-4" /> Stampa
        </button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <Chip label="Stato" value={menuActive ? "Attivo" : "Vuoto"} tone={menuActive ? "success" : "warn"} />
        <Chip label="Piatti" value={dailyDishes.length} tone="default" />
        {recipes.length > 0 && <Chip label="Ricette disponibili" value={recipes.length} tone="accent" />}
      </div>

      {/* Add form */}
      <Card title="Aggiungi piatto del giorno" headerRight={<Plus className="h-4 w-4 text-rw-accent" />}>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={handleAdd}>
          <div>
            <label className={labelCls}>Nome piatto</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Es. Risotto alla milanese" className={inputCls} />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className={labelCls}>Descrizione</label>
            <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Breve descrizione" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Categoria</label>
            <select value={newCat} onChange={(e) => setNewCat(e.target.value)} className={inputCls}>
              {categoryOptions.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Prezzo (€)</label>
            <input type="number" step="0.50" min={0} value={newPrice || ""} onChange={(e) => setNewPrice(Number(e.target.value))} placeholder="0.00" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Allergeni</label>
            <input type="text" value={newAllergens} onChange={(e) => setNewAllergens(e.target.value)} placeholder="Glutine, Lattosio..." className={inputCls} />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <button type="submit" className={btnPrimary}>
              <Plus className="h-4 w-4" /> Aggiungi
            </button>
          </div>
        </form>
      </Card>

      {/* Dishes by category (screen) */}
      <div className="print:hidden">
        {grouped.map((g) => (
          <div key={g.category} className="space-y-2 mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-rw-muted">{g.category}</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((d) => (
                <div key={d.id} className="group rounded-xl border border-rw-line bg-rw-surface p-4 transition hover:border-rw-accent/25">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-rw-ink">{d.name}</p>
                      <p className="mt-0.5 text-xs text-rw-soft">{d.description}</p>
                      {d.recipeId && <p className="text-[10px] text-rw-accent mt-0.5">da ricetta</p>}
                    </div>
                    <span className="shrink-0 text-lg font-bold text-rw-accent">€{d.price.toFixed(2)}</span>
                  </div>
                  {d.allergens && <p className="mt-2 text-[11px] text-rw-muted">Allergeni: {d.allergens}</p>}
                  <div className="mt-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
                    <button type="button" onClick={() => openEdit(d)} className="inline-flex items-center gap-1 rounded-lg border border-rw-line px-2.5 py-1.5 text-xs font-semibold text-rw-soft hover:text-rw-ink">
                      <Edit3 className="h-3 w-3" /> Modifica
                    </button>
                    <button type="button" onClick={() => removeDailyDish(d.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10">
                      <Trash2 className="h-3 w-3" /> Rimuovi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {dailyDishes.length === 0 && (
          <p className="py-12 text-center text-sm text-rw-muted">Nessun piatto nel menu del giorno.</p>
        )}
      </div>

      {/* Print-only view */}
      <div className="hidden print:block">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Menu del Giorno</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString("it-IT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        {grouped.map((g) => (
          <div key={g.category} className="mb-4">
            <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-2">{g.category}</h2>
            {g.items.map((d) => (
              <div key={d.id} className="py-1.5">
                <div className="flex justify-between">
                  <span className="font-medium">{d.name}</span>
                  <span className="font-semibold">€{d.price.toFixed(2)}</span>
                </div>
                {d.description && <p className="text-xs text-gray-500">{d.description}</p>}
                {d.allergens && <p className="text-[10px] text-gray-400 italic">Allergeni: {d.allergens}</p>}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Edit modal */}
      <Modal open={!!editDish} onClose={() => setEditDish(null)} title="Modifica piatto">
        {editDish && (
          <form className="space-y-3" onSubmit={saveEdit}>
            <div>
              <label className={labelCls}>Nome</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Descrizione</label>
              <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Categoria</label>
                <select value={editCat} onChange={(e) => setEditCat(e.target.value)} className={inputCls}>
                  {categoryOptions.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Prezzo (€)</label>
                <input type="number" step="0.50" value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Allergeni</label>
              <input type="text" value={editAllergens} onChange={(e) => setEditAllergens(e.target.value)} className={inputCls} />
            </div>
            <button type="submit" className={cn(btnPrimary, "w-full")}>
              Salva modifiche
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
