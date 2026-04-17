"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calculator,
  ChevronDown,
  DollarSign,
  Loader2,
  Percent,
  Plus,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { kitchenApi, type FoodCostResult, type Recipe } from "@/lib/api-client";

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export function FoodCostPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [foodCost, setFoodCost] = useState<FoodCostResult | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecipes = useCallback(async () => {
    setLoadingList(true);
    try {
      const rows = await kitchenApi.listRecipes();
      setRecipes(rows);
      if (rows.length > 0 && !selectedId) {
        setSelectedId(rows[0].id);
      }
      setError(null);
    } catch (err) {
      setError((err as Error).message ?? "Errore caricamento ricette");
    } finally {
      setLoadingList(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadRecipes();
  }, [loadRecipes]);

  useEffect(() => {
    if (!selectedId) {
      setFoodCost(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    kitchenApi
      .getFoodCost(selectedId)
      .then((result) => {
        if (!cancelled) setFoodCost(result);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message ?? "Errore food cost");
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selectedRecipe = useMemo(
    () => recipes.find((r) => r.id === selectedId) ?? null,
    [recipes, selectedId],
  );

  const fcPct = foodCost?.fcPct ?? 0;
  const margin = foodCost?.margin ?? 0;
  const suggestedPrice = foodCost?.suggestedPrice ?? 0;
  const ingredientCost = foodCost?.ingredientCost ?? 0;
  const productionCost = foodCost?.productionCost ?? 0;
  const portionCost = foodCost?.portionCost ?? 0;
  const targetFc = selectedRecipe?.targetFcPct ?? 0;
  const sellingPrice = selectedRecipe?.sellingPrice ?? 0;
  const fcHealthy = targetFc > 0 ? fcPct <= targetFc : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Food Cost"
        subtitle="Calcolo costo porzione e margine per ricetta (dati DB reali)"
      />

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[260px]">
          <label className={labelCls}>Ricetta</label>
          <div className="relative">
            <select
              className={cn(inputCls, "appearance-none pr-9")}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={loadingList || recipes.length === 0}
            >
              {recipes.length === 0 && <option value="">Nessuna ricetta disponibile</option>}
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
          </div>
        </div>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => void loadRecipes()}
          disabled={loadingList}
        >
          {loadingList ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {loadingList ? "Carico..." : "Ricarica ricette"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Chip
          label="Ricetta"
          value={selectedRecipe?.name ?? "—"}
          tone="accent"
        />
        <Chip
          label="Ingredienti"
          value={selectedRecipe?.ingredients.length ?? 0}
          tone="default"
        />
        <Chip
          label="FC%"
          value={loadingDetail ? "…" : `${fcPct.toFixed(1)}%`}
          tone={fcHealthy ? "success" : "danger"}
        />
      </div>

      <Card
        title={selectedRecipe?.name ?? "Food cost"}
        description="Scheda food cost calcolata dal backend su dati persistenti"
      >
        {!selectedRecipe ? (
          <p className="py-8 text-center text-sm text-rw-muted">
            {loadingList
              ? "Caricamento ricette dal database..."
              : "Nessuna ricetta trovata. Crea una nuova ricetta dall'area Cucina."}
          </p>
        ) : (
          <>
            <div className="mb-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "Porzioni", value: selectedRecipe.portions, suffix: "" },
                { label: "Prezzo vendita", value: sellingPrice.toFixed(2), prefix: "€" },
                { label: "Target FC%", value: targetFc, suffix: "%" },
                { label: "IVA %", value: selectedRecipe.ivaPct, suffix: "%" },
                { label: "Overhead %", value: selectedRecipe.overheadPct, suffix: "%" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-rw-muted">
                    {item.label}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-rw-ink">
                    {item.prefix}
                    {item.value}
                    {item.suffix}
                  </p>
                </div>
              ))}
            </div>

            <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Packaging", value: `€${selectedRecipe.packagingCost.toFixed(2)}` },
                { label: "Manodopera", value: `€${selectedRecipe.laborCost.toFixed(2)}` },
                { label: "Energia", value: `€${selectedRecipe.energyCost.toFixed(2)}` },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-rw-line/50 bg-rw-surfaceAlt px-3 py-2 text-sm"
                >
                  <span className="text-rw-muted">{item.label}</span>
                  <span className="font-semibold tabular-nums text-rw-soft">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-rw-muted">
                  Ingredienti ({selectedRecipe.ingredients.length})
                </p>
                <span className="text-xs text-rw-muted">
                  Costi aggiornati da magazzino quando collegato
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-rw-line">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">
                        Ingrediente
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">
                        Qtà
                      </th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-rw-muted">
                        Unità
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">
                        €/unità
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">
                        Totale
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">
                        Scarto%
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRecipe.ingredients.map((i) => {
                      const lineTotal = i.qty * i.unitCost;
                      const lineWithWaste = lineTotal * (1 + i.wastePct / 100);
                      return (
                        <tr
                          key={i.id}
                          className="border-b border-rw-line/50 transition hover:bg-rw-surfaceAlt/50"
                        >
                          <td className="px-3 py-2.5 font-medium text-rw-ink">{i.name}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{i.qty}</td>
                          <td className="px-3 py-2.5 text-center text-rw-muted">{i.unit}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            €{i.unitCost.toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-rw-ink">
                            €{lineWithWaste.toFixed(3)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-rw-muted">
                            {i.wastePct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-rw-line bg-rw-surfaceAlt">
                      <td
                        colSpan={4}
                        className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-rw-muted"
                      >
                        Totale ingredienti
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums text-rw-accent">
                        €{ingredientCost.toFixed(3)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

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
                value={`€${sellingPrice.toFixed(2)}`}
                accent
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div
                className={cn(
                  "rounded-xl border p-4 text-center",
                  fcHealthy
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-red-500/30 bg-red-500/10",
                )}
              >
                <Percent
                  className={cn(
                    "mx-auto h-6 w-6",
                    fcHealthy ? "text-emerald-400" : "text-red-400",
                  )}
                />
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-rw-muted">
                  Food Cost %
                </p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-bold",
                    fcHealthy ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {fcPct.toFixed(1)}%
                </p>
                <p className="mt-0.5 text-xs text-rw-muted">Target: {targetFc}%</p>
              </div>

              <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4 text-center">
                <TrendingUp className="mx-auto h-6 w-6 text-rw-accent" />
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-rw-muted">
                  Margine
                </p>
                <p className="mt-1 text-2xl font-bold text-rw-ink">€{margin.toFixed(2)}</p>
                <p className="mt-0.5 text-xs text-rw-muted">Per porzione</p>
              </div>

              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-center">
                <DollarSign className="mx-auto h-6 w-6 text-blue-400" />
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-rw-muted">
                  Prezzo suggerito
                </p>
                <p className="mt-1 text-2xl font-bold text-blue-400">
                  €{suggestedPrice.toFixed(2)}
                </p>
                <p className="mt-0.5 text-xs text-rw-muted">Per raggiungere il target</p>
              </div>
            </div>
          </>
        )}
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
    <div
      className={cn(
        "rounded-xl border p-4",
        accent ? "border-rw-accent/30 bg-rw-accent/10" : "border-rw-line bg-rw-surfaceAlt",
      )}
    >
      <div className="flex items-center gap-2">
        <span className={accent ? "text-rw-accent" : "text-rw-muted"}>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-rw-muted">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "mt-2 text-xl font-bold tabular-nums",
          accent ? "text-rw-accent" : "text-rw-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}
