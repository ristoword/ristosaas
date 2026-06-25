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
import { kitchenApi, menuApi, type FoodCostResult, type Recipe, type MenuItem, type DailyDish } from "@/lib/api-client";
import { useI18n } from "@/core/i18n/provider";

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

type FoodCostEntry = {
  id: string;
  recipeId: string;
  name: string;
  source: "recipe" | "menu_casa" | "menu_giorno";
  price: number | null;
};

export function FoodCostPage() {
  const { t } = useI18n();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [entries, setEntries] = useState<FoodCostEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [foodCost, setFoodCost] = useState<FoodCostResult | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecipes = useCallback(async () => {
    setLoadingList(true);
    try {
      const [recipeRows, menuItems, dailyDishes] = await Promise.all([
        kitchenApi.listRecipes(),
        menuApi.listItems().catch(() => [] as MenuItem[]),
        menuApi.listDaily().catch(() => [] as DailyDish[]),
      ]);
      setRecipes(recipeRows);

      const recipeIds = new Set(recipeRows.map((r) => r.id));
      const all: FoodCostEntry[] = [];

      for (const r of recipeRows) {
        all.push({ id: r.id, recipeId: r.id, name: r.name, source: "recipe", price: r.sellingPrice ?? null });
      }
      for (const m of menuItems) {
        if (m.recipeId && !recipeIds.has(m.recipeId)) continue;
        if (m.recipeId) {
          all.push({ id: `mi-${m.id}`, recipeId: m.recipeId, name: m.name, source: "menu_casa", price: m.price });
        }
      }
      for (const d of dailyDishes) {
        if (d.recipeId && !recipeIds.has(d.recipeId)) continue;
        if (d.recipeId) {
          all.push({ id: `dd-${d.id}`, recipeId: d.recipeId, name: d.name, source: "menu_giorno", price: d.price });
        }
      }

      setEntries(all);
      if (all.length > 0 && !selectedId) {
        setSelectedId(all[0].id);
      }
      setError(null);
    } catch (err) {
      setError((err as Error).message ?? t("cucina.recipe.error_load"));
    } finally {
      setLoadingList(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadRecipes();
  }, [loadRecipes]);

  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId],
  );

  useEffect(() => {
    const recipeId = selectedEntry?.recipeId;
    if (!recipeId) {
      setFoodCost(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    kitchenApi
      .getFoodCost(recipeId)
      .then((result) => {
        if (!cancelled) setFoodCost(result);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message ?? t("cucina.foodcost.error"));
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedEntry]);

  const selectedRecipe = useMemo(
    () => {
      const recipeId = selectedEntry?.recipeId;
      return recipeId ? recipes.find((r) => r.id === recipeId) ?? null : null;
    },
    [recipes, selectedEntry],
  );

  const fcPct = foodCost?.fcPct ?? 0;
  const margin = foodCost?.margin ?? 0;
  const suggestedPrice = foodCost?.suggestedPrice ?? 0;
  const ingredientCost = foodCost?.ingredientCost ?? 0;
  const productionCost = foodCost?.productionCost ?? 0;
  const portionCost = foodCost?.portionCost ?? 0;
  const targetFc = selectedRecipe?.targetFcPct ?? 0;
  const sellingPrice = selectedEntry?.price ?? selectedRecipe?.sellingPrice ?? 0;
  const fcHealthy = targetFc > 0 ? fcPct <= targetFc : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Food Cost"
        subtitle={t("cucina.foodcost.subtitle")}
      />

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[260px]">
          <label className={labelCls}>{t("cucina.recipe.label")}</label>
          <div className="relative">
            <select
              className={cn(inputCls, "appearance-none pr-9")}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={loadingList || entries.length === 0}
            >
              {entries.length === 0 && <option value="">{t("cucina.recipe.no_recipes")}</option>}
              {entries.filter((e) => e.source === "menu_casa").length > 0 && (
                <optgroup label={t("nav.menu-admin.label")}>
                  {entries.filter((e) => e.source === "menu_casa").map((e) => (
                    <option key={e.id} value={e.id}>{e.name}{e.price != null ? ` — €${e.price.toFixed(2)}` : ""}</option>
                  ))}
                </optgroup>
              )}
              {entries.filter((e) => e.source === "menu_giorno").length > 0 && (
                <optgroup label={t("nav.daily-menu.label")}>
                  {entries.filter((e) => e.source === "menu_giorno").map((e) => (
                    <option key={e.id} value={e.id}>{e.name}{e.price != null ? ` — €${e.price.toFixed(2)}` : ""}</option>
                  ))}
                </optgroup>
              )}
              {entries.filter((e) => e.source === "recipe").length > 0 && (
                <optgroup label={t("cucina.recipe.label")}>
                  {entries.filter((e) => e.source === "recipe").map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </optgroup>
              )}
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
          {loadingList ? t("cucina.foodcost.loading_btn") : t("cucina.foodcost.reload")}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Chip
          label={selectedEntry?.source === "menu_casa" ? t("nav.menu-admin.label") : selectedEntry?.source === "menu_giorno" ? t("nav.daily-menu.label") : t("cucina.recipe.label")}
          value={selectedEntry?.name ?? "—"}
          tone="accent"
        />
        <Chip
          label={t("cucina.recipe.ingredients")}
          value={selectedRecipe?.ingredients.length ?? 0}
          tone="default"
        />
        <Chip
          label={t("cucina.recipe.fc_pct")}
          value={loadingDetail ? "…" : `${fcPct.toFixed(1)}%`}
          tone={fcHealthy ? "success" : "danger"}
        />
      </div>

      <Card
        title={selectedEntry?.name ?? "Food Cost"}
        description={t("cucina.foodcost.card_desc")}
      >
        {!selectedRecipe ? (
          <p className="py-8 text-center text-sm text-rw-muted">
            {loadingList
              ? t("cucina.foodcost.loading")
              : t("cucina.foodcost.empty")}
          </p>
        ) : (
          <>
            <div className="mb-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: t("cucina.recipe.portions"), value: selectedRecipe.portions, suffix: "" },
                { label: t("cucina.recipe.fc_selling_price"), value: sellingPrice.toFixed(2), prefix: "€" },
                { label: t("cucina.recipe.target_fc"), value: targetFc, suffix: "%" },
                { label: t("cucina.recipe.iva"), value: selectedRecipe.ivaPct, suffix: "%" },
                { label: t("cucina.recipe.overhead"), value: selectedRecipe.overheadPct, suffix: "%" },
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
                { label: t("cucina.foodcost.packaging"), value: `€${selectedRecipe.packagingCost.toFixed(2)}` },
                { label: t("cucina.foodcost.labor"), value: `€${selectedRecipe.laborCost.toFixed(2)}` },
                { label: t("cucina.foodcost.energy"), value: `€${selectedRecipe.energyCost.toFixed(2)}` },
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
                  {t("cucina.recipe.ingredients")} ({selectedRecipe.ingredients.length})
                </p>
                <span className="text-xs text-rw-muted">
                  {t("cucina.foodcost.costs_note")}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-rw-line">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">
                        {t("cucina.recipe.ingredient")}
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">
                        {t("cucina.recipe.qty")}
                      </th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-rw-muted">
                        {t("cucina.recipe.unit")}
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">
                        {t("cucina.recipe.unit_cost")}
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">
                        {t("ui.total")}
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">
                        {t("cucina.recipe.waste_pct")}
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
                        {t("cucina.recipe.fc_ingredient_total")}
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
                label={t("cucina.recipe.fc_ingredient_cost")}
                value={`€${ingredientCost.toFixed(2)}`}
              />
              <SummaryCard
                icon={<Calculator className="h-5 w-5" />}
                label={t("cucina.recipe.fc_production_cost")}
                value={`€${productionCost.toFixed(2)}`}
              />
              <SummaryCard
                icon={<Calculator className="h-5 w-5" />}
                label={t("cucina.recipe.fc_portion_cost")}
                value={`€${portionCost.toFixed(2)}`}
              />
              <SummaryCard
                icon={<DollarSign className="h-5 w-5" />}
                label={t("cucina.recipe.fc_selling_price")}
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
                  {t("cucina.recipe.fc_pct_label")}
                </p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-bold",
                    fcHealthy ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {fcPct.toFixed(1)}%
                </p>
                <p className="mt-0.5 text-xs text-rw-muted">{t("cucina.foodcost.target").replace("{n}", String(targetFc))}</p>
              </div>

              <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4 text-center">
                <TrendingUp className="mx-auto h-6 w-6 text-rw-accent" />
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-rw-muted">
                  {t("cucina.recipe.fc_margin")}
                </p>
                <p className="mt-1 text-2xl font-bold text-rw-ink">€{margin.toFixed(2)}</p>
                <p className="mt-0.5 text-xs text-rw-muted">{t("cucina.foodcost.per_portion")}</p>
              </div>

              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-center">
                <DollarSign className="mx-auto h-6 w-6 text-blue-400" />
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-rw-muted">
                  {t("cucina.recipe.fc_suggested_price")}
                </p>
                <p className="mt-1 text-2xl font-bold text-blue-400">
                  €{suggestedPrice.toFixed(2)}
                </p>
                <p className="mt-0.5 text-xs text-rw-muted">{t("cucina.foodcost.reach_target")}</p>
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
