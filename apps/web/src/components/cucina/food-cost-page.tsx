"use client";

import { useState } from "react";
import {
  Calculator,
  ChevronDown,
  DollarSign,
  Percent,
  Plus,
  Trash2,
  TrendingUp,
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
const smallInputCls =
  "w-full rounded-lg border border-rw-line bg-rw-surfaceAlt px-2 py-1.5 text-sm text-rw-ink tabular-nums focus:border-rw-accent focus:outline-none text-right";

/* ── Types ─────────────────────────────────────────── */
type Ingredient = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  unitCost: number;
  waste: number;
  notes: string;
};

/* ── Mock data ─────────────────────────────────────── */
const recipes = [
  "Carbonara tradizionale",
  "Margherita classica",
  "Tiramisù della casa",
  "Grigliata mista",
  "Risotto ai porcini",
];

const mockIngredients: Ingredient[] = [
  { id: "i1", name: "Guanciale DOP", qty: 0.08, unit: "kg", unitCost: 22.0, waste: 5, notes: "" },
  { id: "i2", name: "Pecorino Romano DOP", qty: 0.04, unit: "kg", unitCost: 18.0, waste: 3, notes: "Grattugiato" },
  { id: "i3", name: "Tuorlo d'uovo", qty: 3, unit: "pz", unitCost: 0.25, waste: 0, notes: "Cat. A" },
  { id: "i4", name: "Spaghetti", qty: 0.1, unit: "kg", unitCost: 3.5, waste: 0, notes: "Trafilati al bronzo" },
  { id: "i5", name: "Pepe nero Tellicherry", qty: 0.002, unit: "kg", unitCost: 45.0, waste: 0, notes: "Macinato fresco" },
];

const meta = {
  yieldPct: 95,
  sellingPrice: 12.0,
  targetFcPct: 30,
  ivaPct: 10,
  overheadPct: 5,
  packaging: 0.0,
  labor: 1.5,
  energy: 0.2,
  extra: 0.0,
};

export function FoodCostPage() {
  const [selectedRecipe, setSelectedRecipe] = useState(recipes[0]);
  const [ingredients] = useState<Ingredient[]>(mockIngredients);

  const ingredientCost = ingredients.reduce(
    (sum, i) => sum + i.qty * i.unitCost * (1 + i.waste / 100),
    0,
  );
  const productionCost = ingredientCost + meta.packaging + meta.labor + meta.energy + meta.extra;
  const portionCost = productionCost / (meta.yieldPct / 100);
  const totalWithOverhead = portionCost * (1 + meta.overheadPct / 100);
  const fcPct = (totalWithOverhead / meta.sellingPrice) * 100;
  const margin = meta.sellingPrice - totalWithOverhead;
  const suggestedPrice = totalWithOverhead / (meta.targetFcPct / 100);

  const fcHealthy = fcPct <= meta.targetFcPct;

  return (
    <div className="space-y-6">
      <PageHeader title="Food Cost" subtitle="Calcolo costo porzione e margine per ricetta" />

      {/* Recipe selector */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px]">
          <label className={labelCls}>Ricetta</label>
          <div className="relative">
            <select
              className={cn(inputCls, "appearance-none pr-9")}
              value={selectedRecipe}
              onChange={(e) => setSelectedRecipe(e.target.value)}
            >
              {recipes.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
          </div>
        </div>
        <button type="button" className={btnPrimary}>
          <Plus className="h-4 w-4" />
          Nuova ricetta
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Chip label="Ricetta" value={selectedRecipe} tone="accent" />
        <Chip label="Ingredienti" value={ingredients.length} tone="default" />
        <Chip label="FC%" value={`${fcPct.toFixed(1)}%`} tone={fcHealthy ? "success" : "danger"} />
      </div>

      {/* Main worksheet card */}
      <Card title={selectedRecipe} description="Scheda food cost completa">
        {/* Meta row */}
        <div className="mb-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Resa %", value: meta.yieldPct, suffix: "%" },
            { label: "Prezzo vendita", value: meta.sellingPrice, prefix: "€" },
            { label: "Target FC%", value: meta.targetFcPct, suffix: "%" },
            { label: "IVA %", value: meta.ivaPct, suffix: "%" },
            { label: "Overhead %", value: meta.overheadPct, suffix: "%" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-rw-muted">{item.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-rw-ink">
                {item.prefix}{item.value}{item.suffix}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Packaging", value: `€${meta.packaging.toFixed(2)}` },
            { label: "Manodopera", value: `€${meta.labor.toFixed(2)}` },
            { label: "Energia", value: `€${meta.energy.toFixed(2)}` },
            { label: "Extra €", value: `€${meta.extra.toFixed(2)}` },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg border border-rw-line/50 bg-rw-surfaceAlt px-3 py-2 text-sm">
              <span className="text-rw-muted">{item.label}</span>
              <span className="font-semibold tabular-nums text-rw-soft">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Ingredients table */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-rw-muted">Ingredienti</p>
            <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-rw-line px-2.5 py-1.5 text-xs font-semibold text-rw-soft hover:text-rw-ink">
              <Plus className="h-3 w-3" />
              Aggiungi riga
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-rw-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Ingrediente</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">Qtà</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-rw-muted">Unità</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">€/unità</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">Totale</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">Scarto%</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Note</th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {ingredients.map((i) => {
                  const lineTotal = i.qty * i.unitCost;
                  const lineWithWaste = lineTotal * (1 + i.waste / 100);
                  return (
                    <tr key={i.id} className="border-b border-rw-line/50 transition hover:bg-rw-surfaceAlt/50">
                      <td className="px-3 py-2.5 font-medium text-rw-ink">{i.name}</td>
                      <td className="px-3 py-2.5">
                        <input type="number" defaultValue={i.qty} step="0.001" className={smallInputCls} />
                      </td>
                      <td className="px-3 py-2.5 text-center text-rw-muted">{i.unit}</td>
                      <td className="px-3 py-2.5">
                        <input type="number" defaultValue={i.unitCost} step="0.01" className={smallInputCls} />
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-rw-ink">
                        €{lineWithWaste.toFixed(3)}
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" defaultValue={i.waste} min={0} max={100} className={cn(smallInputCls, "w-16")} />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-rw-muted">{i.notes}</td>
                      <td className="px-3 py-2.5">
                        <button type="button" className="text-rw-muted hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-rw-line bg-rw-surfaceAlt">
                  <td colSpan={4} className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-rw-muted">
                    Totale ingredienti
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-rw-accent">
                    €{ingredientCost.toFixed(3)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Costo ingredienti"
            value={`€${ingredientCost.toFixed(2)}`}
          />
          <SummaryCard
            icon={<Calculator className="h-5 w-5" />}
            label="Costo produzione"
            value={`€${productionCost.toFixed(2)}`}
          />
          <SummaryCard
            icon={<Calculator className="h-5 w-5" />}
            label="Costo porzione"
            value={`€${portionCost.toFixed(2)}`}
          />
          <SummaryCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Prezzo vendita"
            value={`€${meta.sellingPrice.toFixed(2)}`}
            accent
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className={cn(
            "rounded-xl border p-4 text-center",
            fcHealthy
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-red-500/30 bg-red-500/10",
          )}>
            <Percent className={cn("mx-auto h-6 w-6", fcHealthy ? "text-emerald-400" : "text-red-400")} />
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-rw-muted">Food Cost %</p>
            <p className={cn("mt-1 text-2xl font-bold", fcHealthy ? "text-emerald-400" : "text-red-400")}>
              {fcPct.toFixed(1)}%
            </p>
            <p className="mt-0.5 text-xs text-rw-muted">Target: {meta.targetFcPct}%</p>
          </div>

          <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4 text-center">
            <TrendingUp className="mx-auto h-6 w-6 text-rw-accent" />
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-rw-muted">Margine</p>
            <p className="mt-1 text-2xl font-bold text-rw-ink">€{margin.toFixed(2)}</p>
            <p className="mt-0.5 text-xs text-rw-muted">Per porzione</p>
          </div>

          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-center">
            <DollarSign className="mx-auto h-6 w-6 text-blue-400" />
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-rw-muted">Prezzo suggerito</p>
            <p className="mt-1 text-2xl font-bold text-blue-400">€{suggestedPrice.toFixed(2)}</p>
            <p className="mt-0.5 text-xs text-rw-muted">Per raggiungere il target</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border p-4",
      accent
        ? "border-rw-accent/30 bg-rw-accent/10"
        : "border-rw-line bg-rw-surfaceAlt",
    )}>
      <div className="flex items-center gap-2">
        <span className={accent ? "text-rw-accent" : "text-rw-muted"}>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-rw-muted">{label}</span>
      </div>
      <p className={cn("mt-2 text-xl font-bold tabular-nums", accent ? "text-rw-accent" : "text-rw-ink")}>
        {value}
      </p>
    </div>
  );
}
