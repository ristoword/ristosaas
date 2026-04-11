"use client";

import { useState } from "react";
import {
  Edit3,
  Plus,
  Power,
  Printer,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { Modal } from "@/components/shared/modal";

/* ── Styles ────────────────────────────────────────── */
const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

/* ── Types ─────────────────────────────────────────── */
type DailyDish = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  allergens: string;
};

const categoryOptions = ["Antipasti", "Primi", "Secondi", "Contorni", "Dolci"];

const mockDailyDishes: DailyDish[] = [
  { id: "dd1", name: "Vellutata di zucca", description: "Con crostini e olio al rosmarino", category: "Primi", price: 10.0, allergens: "Glutine" },
  { id: "dd2", name: "Risotto ai funghi porcini", description: "Riso Carnaroli mantecato al parmigiano", category: "Primi", price: 14.0, allergens: "Lattosio" },
  { id: "dd3", name: "Carpaccio di polpo", description: "Con patate e olive taggiasche", category: "Antipasti", price: 13.0, allergens: "Molluschi" },
  { id: "dd4", name: "Filetto al pepe verde", description: "Con purè di patate", category: "Secondi", price: 22.0, allergens: "" },
  { id: "dd5", name: "Verdure grigliate", description: "Di stagione con emulsione di aceto balsamico", category: "Contorni", price: 7.0, allergens: "" },
  { id: "dd6", name: "Millefoglie alla crema", description: "Pasta sfoglia, crema pasticcera, frutti di bosco", category: "Dolci", price: 8.0, allergens: "Glutine, Uova, Lattosio" },
];

export function DailyMenuPage() {
  const [dishes, setDishes] = useState<DailyDish[]>(mockDailyDishes);
  const [menuActive, setMenuActive] = useState(true);
  const [editDish, setEditDish] = useState<DailyDish | null>(null);

  const grouped = categoryOptions
    .map((cat) => ({ category: cat, items: dishes.filter((d) => d.category === cat) }))
    .filter((g) => g.items.length > 0);

  function handleDelete(id: string) {
    setDishes((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Menu del Giorno" subtitle="Piatti speciali e proposte giornaliere">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-4 py-2 text-sm font-semibold text-rw-soft hover:text-rw-ink"
        >
          <Printer className="h-4 w-4" />
          Stampa
        </button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-4">
        <Chip label="Stato" value={menuActive ? "Attivo" : "Inattivo"} tone={menuActive ? "success" : "danger"} />
        <Chip label="Piatti" value={dishes.length} tone="default" />

        <button
          type="button"
          onClick={() => setMenuActive(!menuActive)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
            menuActive
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              : "border-rw-line bg-rw-surfaceAlt text-rw-muted hover:text-rw-soft",
          )}
        >
          <Power className="h-4 w-4" />
          {menuActive ? "Menu attivo" : "Attiva menu"}
        </button>
      </div>

      {/* Add form */}
      <Card title="Aggiungi piatto del giorno" headerRight={<Plus className="h-4 w-4 text-rw-accent" />}>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className={labelCls}>Nome piatto</label>
            <input type="text" placeholder="Es. Risotto alla milanese" className={inputCls} />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className={labelCls}>Descrizione</label>
            <input type="text" placeholder="Breve descrizione" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Categoria</label>
            <select className={inputCls}>
              {categoryOptions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Prezzo (€)</label>
            <input type="number" step="0.50" min={0} placeholder="0.00" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Allergeni</label>
            <input type="text" placeholder="Glutine, Lattosio..." className={inputCls} />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <button type="submit" className={btnPrimary}>
              <Plus className="h-4 w-4" />
              Aggiungi
            </button>
          </div>
        </form>
      </Card>

      {/* Dishes by category */}
      {grouped.map((g) => (
        <div key={g.category} className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-rw-muted">{g.category}</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.items.map((d) => (
              <div
                key={d.id}
                className="group rounded-xl border border-rw-line bg-rw-surface p-4 transition hover:border-rw-accent/25"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-rw-ink">{d.name}</p>
                    <p className="mt-0.5 text-xs text-rw-soft">{d.description}</p>
                  </div>
                  <span className="shrink-0 text-lg font-bold text-rw-accent">€{d.price.toFixed(2)}</span>
                </div>
                {d.allergens && (
                  <p className="mt-2 text-[11px] text-rw-muted">Allergeni: {d.allergens}</p>
                )}
                <div className="mt-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setEditDish(d)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rw-line px-2.5 py-1.5 text-xs font-semibold text-rw-soft hover:text-rw-ink"
                  >
                    <Edit3 className="h-3 w-3" />
                    Modifica
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(d.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" />
                    Rimuovi
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {dishes.length === 0 && (
        <p className="py-12 text-center text-sm text-rw-muted">Nessun piatto nel menu del giorno.</p>
      )}

      {/* Edit modal */}
      <Modal open={!!editDish} onClose={() => setEditDish(null)} title="Modifica piatto">
        {editDish && (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setEditDish(null); }}>
            <div>
              <label className={labelCls}>Nome</label>
              <input type="text" defaultValue={editDish.name} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Descrizione</label>
              <input type="text" defaultValue={editDish.description} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Categoria</label>
                <select className={inputCls} defaultValue={editDish.category}>
                  {categoryOptions.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Prezzo (€)</label>
                <input type="number" step="0.50" defaultValue={editDish.price} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Allergeni</label>
              <input type="text" defaultValue={editDish.allergens} className={inputCls} />
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
