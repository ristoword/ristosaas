"use client";

import { useState } from "react";
import {
  BookOpen,
  Calculator,
  ChevronDown,
  ChevronUp,
  Filter,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";

/* ── Styles ────────────────────────────────────────── */
const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

/* ── Types ─────────────────────────────────────────── */
type Dish = {
  id: string;
  name: string;
  category: string;
  area: string;
  price: number;
  code: string;
  active: boolean;
  recipe: string;
  notes: string;
};

type Ingredient = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  unitCost: number;
  waste: number;
};

/* ── Mock dishes ───────────────────────────────────── */
const mockDishes: Dish[] = [
  { id: "d1", name: "Margherita", category: "Pizze", area: "Pizzeria", price: 8.0, code: "PZ01", active: true, recipe: "Impasto classico", notes: "" },
  { id: "d2", name: "Carbonara", category: "Primi", area: "Cucina", price: 12.0, code: "PR01", active: true, recipe: "Carbonara tradizionale", notes: "" },
  { id: "d3", name: "Tiramisù", category: "Dolci", area: "Cucina", price: 7.0, code: "DO01", active: true, recipe: "Tiramisù classico", notes: "" },
  { id: "d4", name: "Bruschetta mista", category: "Antipasti", area: "Cucina", price: 9.0, code: "AN01", active: true, recipe: "", notes: "Senza glutine su richiesta" },
  { id: "d5", name: "Grigliata mista", category: "Secondi", area: "Cucina", price: 18.0, code: "SE01", active: true, recipe: "Grigliata RW", notes: "" },
  { id: "d6", name: "Diavola", category: "Pizze", area: "Pizzeria", price: 10.0, code: "PZ02", active: true, recipe: "Impasto classico", notes: "Piccante" },
  { id: "d7", name: "Insalata Caesar", category: "Contorni", area: "Cucina", price: 8.5, code: "CO01", active: false, recipe: "", notes: "Stagionale" },
  { id: "d8", name: "Panna cotta", category: "Dolci", area: "Cucina", price: 6.5, code: "DO02", active: true, recipe: "Panna cotta vaniglia", notes: "" },
  { id: "d9", name: "Spritz", category: "Bevande", area: "Bar", price: 7.0, code: "BV01", active: true, recipe: "", notes: "" },
  { id: "d10", name: "Tagliata di manzo", category: "Secondi", area: "Cucina", price: 22.0, code: "SE02", active: true, recipe: "Tagliata premium", notes: "Con rucola e grana" },
];

const mockIngredients: Ingredient[] = [
  { id: "i1", name: "Farina 00", qty: 0.25, unit: "kg", unitCost: 1.2, waste: 2 },
  { id: "i2", name: "Mozzarella fior di latte", qty: 0.15, unit: "kg", unitCost: 8.5, waste: 5 },
  { id: "i3", name: "Pomodoro San Marzano", qty: 0.1, unit: "kg", unitCost: 3.0, waste: 10 },
  { id: "i4", name: "Olio EVO", qty: 0.02, unit: "l", unitCost: 9.0, waste: 0 },
  { id: "i5", name: "Lievito madre", qty: 0.03, unit: "kg", unitCost: 2.5, waste: 0 },
];

const categories = ["Tutti", "Pizze", "Primi", "Secondi", "Antipasti", "Contorni", "Dolci", "Bevande"];

export function MenuAdminPage() {
  const [showFoodCost, setShowFoodCost] = useState(false);
  const [filterCat, setFilterCat] = useState("Tutti");
  const [filterSearch, setFilterSearch] = useState("");

  const filtered = mockDishes.filter((d) => {
    if (filterCat !== "Tutti" && d.category !== filterCat) return false;
    if (filterSearch && !d.name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const ingredientCost = mockIngredients.reduce((s, i) => s + i.qty * i.unitCost * (1 + i.waste / 100), 0);
  const iva = 10;
  const overhead = 5;
  const packaging = 0.3;
  const labor = 1.2;
  const energy = 0.15;
  const yieldPct = 95;
  const sellingPrice = 8.0;
  const productionCost = ingredientCost + packaging + labor + energy;
  const portionCost = productionCost / (yieldPct / 100);
  const overheadCost = portionCost * (1 + overhead / 100);
  const fcPct = (overheadCost / sellingPrice) * 100;
  const targetFc = 30;
  const suggestedPrice = overheadCost / (targetFc / 100);
  const margin = sellingPrice - overheadCost;

  return (
    <div className="space-y-6">
      <PageHeader title="Gestione Menu" subtitle="Anagrafica piatti e food cost" />

      <div className="flex flex-wrap gap-3">
        <Chip label="Piatti totali" value={mockDishes.length} tone="default" />
        <Chip label="Attivi" value={mockDishes.filter((d) => d.active).length} tone="success" />
        <Chip label="Categorie" value={new Set(mockDishes.map((d) => d.category)).size} tone="info" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        {/* Left: New dish form + food cost */}
        <div className="space-y-4">
          <Card title="Nuovo piatto" headerRight={<BookOpen className="h-4 w-4 text-rw-accent" />}>
            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className={labelCls}>Nome</label>
                <input type="text" placeholder="Nome del piatto" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Categoria</label>
                  <select className={inputCls}>
                    {categories.filter((c) => c !== "Tutti").map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Area</label>
                  <select className={inputCls}>
                    <option>Cucina</option>
                    <option>Pizzeria</option>
                    <option>Bar</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Ricetta collegata</label>
                <input type="text" placeholder="Nome ricetta" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Prezzo (€)</label>
                  <input type="number" step="0.50" min={0} placeholder="0.00" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Codice</label>
                  <input type="text" placeholder="PZ01" className={inputCls} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" defaultChecked className="peer sr-only" />
                  <div className="h-6 w-11 rounded-full bg-rw-surfaceAlt peer-checked:bg-rw-accent after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-rw-line after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                </label>
                <span className="text-sm text-rw-soft">Attivo</span>
              </div>
              <div>
                <label className={labelCls}>Note</label>
                <textarea rows={2} placeholder="Allergeni, varianti..." className={cn(inputCls, "resize-y")} />
              </div>
              <button type="submit" className={cn(btnPrimary, "w-full")}>
                <Plus className="h-4 w-4" />
                Salva piatto
              </button>
            </form>
          </Card>

          {/* Food cost advanced */}
          <Card
            title="Food Cost avanzato"
            headerRight={
              <button type="button" onClick={() => setShowFoodCost(!showFoodCost)} className="text-rw-muted hover:text-rw-ink">
                {showFoodCost ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            }
          >
            {!showFoodCost ? (
              <p className="text-sm text-rw-muted">Espandi per vedere il calcolo food cost dettagliato.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Ingredienti – Margherita</p>
                <div className="overflow-x-auto rounded-xl border border-rw-line">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Ingrediente</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">Qtà</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-rw-muted">Unità</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">€/unità</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">Totale</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">Scarto%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockIngredients.map((i) => (
                        <tr key={i.id} className="border-b border-rw-line/50">
                          <td className="px-3 py-2 text-rw-soft">{i.name}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-rw-soft">{i.qty}</td>
                          <td className="px-3 py-2 text-center text-rw-muted">{i.unit}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-rw-soft">€{i.unitCost.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-rw-ink font-medium">€{(i.qty * i.unitCost).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-rw-muted">{i.waste}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "IVA", value: `${iva}%` },
                    { label: "Overhead", value: `${overhead}%` },
                    { label: "Packaging", value: `€${packaging.toFixed(2)}` },
                    { label: "Manodopera", value: `€${labor.toFixed(2)}` },
                    { label: "Energia", value: `€${energy.toFixed(2)}` },
                    { label: "Resa", value: `${yieldPct}%` },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border border-rw-line/50 bg-rw-surfaceAlt px-3 py-2">
                      <span className="text-rw-muted">{item.label}</span>
                      <span className="font-semibold text-rw-soft">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between rounded-lg border border-rw-line/50 bg-rw-surfaceAlt px-3 py-2">
                    <span className="text-rw-muted">Prezzo vendita</span>
                    <span className="font-semibold text-rw-ink">€{sellingPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-rw-line/50 bg-rw-surfaceAlt px-3 py-2">
                    <span className="text-rw-muted">Target FC%</span>
                    <span className="font-semibold text-rw-accent">{targetFc}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Costo ingredienti", value: `€${ingredientCost.toFixed(2)}` },
                    { label: "Costo porzione", value: `€${portionCost.toFixed(2)}` },
                    { label: "FC%", value: `${fcPct.toFixed(1)}%`, accent: fcPct > targetFc },
                    { label: "Margine", value: `€${margin.toFixed(2)}` },
                    { label: "Prezzo suggerito", value: `€${suggestedPrice.toFixed(2)}` },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-rw-muted">{s.label}</p>
                      <p className={cn("mt-1 text-lg font-bold", s.accent ? "text-red-400" : "text-rw-ink")}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Dishes list */}
        <Card
          title="Piatti registrati"
          description={`${filtered.length} piatti`}
          headerRight={<Calculator className="h-4 w-4 text-rw-muted" />}
        >
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                <input
                  type="text"
                  placeholder="Cerca piatto..."
                  className={cn(inputCls, "pl-9")}
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                />
              </div>
            </div>
            <div>
              <select className={inputCls} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Column headers */}
          <div className="hidden rounded-t-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-rw-muted sm:grid sm:grid-cols-[1fr_100px_80px_80px_60px]">
            <span>Nome</span>
            <span>Categoria</span>
            <span className="text-right">Prezzo</span>
            <span className="text-center">Codice</span>
            <span className="text-center">Stato</span>
          </div>

          <div className="space-y-0">
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-rw-muted">Nessun piatto trovato.</p>
            )}
            {filtered.map((d) => (
              <div
                key={d.id}
                className="flex flex-col gap-1 border-x border-b border-rw-line px-4 py-3 transition hover:bg-rw-surfaceAlt/50 sm:grid sm:grid-cols-[1fr_100px_80px_80px_60px] sm:items-center sm:gap-0"
              >
                <div>
                  <p className="font-semibold text-rw-ink">{d.name}</p>
                  <p className="text-xs text-rw-muted sm:hidden">{d.category} · {d.area}</p>
                </div>
                <span className="hidden text-sm text-rw-soft sm:block">{d.category}</span>
                <span className="text-sm font-medium text-rw-ink sm:text-right">€{d.price.toFixed(2)}</span>
                <span className="text-xs text-rw-muted sm:text-center">{d.code}</span>
                <span className="sm:text-center">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    d.active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400",
                  )}>
                    {d.active ? "On" : "Off"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
