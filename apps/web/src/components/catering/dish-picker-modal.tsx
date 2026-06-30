"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Loader2, Search, UtensilsCrossed, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { kitchenApi, menuApi, type MenuItem, type Recipe } from "@/lib/api-client";

export type PickedDish = {
  name: string;
  sourceType: "recipe" | "menu";
  sourceId: string;
  unitCost: number;
  sellPrice: number;
};

type DishPickerModalProps = {
  open: boolean;
  onClose: () => void;
  onPick: (dish: PickedDish) => void;
};

const GOLD_CARD =
  "rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-b from-rw-surface to-rw-surfaceAlt/90 shadow-[0_4px_24px_rgba(0,0,0,0.18)]";

export function DishPickerModal({ open, onClose, onPick }: DishPickerModalProps) {
  const [tab, setTab] = useState<"menu" | "recipe">("menu");
  const [search, setSearch] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickingId, setPickingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([kitchenApi.listRecipes(), menuApi.listItems()])
      .then(([r, m]) => {
        setRecipes(r);
        setMenuItems(m.filter((i) => i.active));
      })
      .catch(() => {
        setRecipes([]);
        setMenuItems([]);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const filteredRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  }, [recipes, search]);

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems.filter((m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
  }, [menuItems, search]);

  async function pickRecipe(recipe: Recipe) {
    setPickingId(recipe.id);
    try {
      let unitCost = 0;
      try {
        const fc = await kitchenApi.getFoodCost(recipe.id);
        unitCost = fc.portionCost;
      } catch {
        unitCost = recipe.sellingPrice > 0 && recipe.targetFcPct > 0
          ? (recipe.sellingPrice * recipe.targetFcPct) / 100
          : 0;
      }
      onPick({
        name: recipe.name,
        sourceType: "recipe",
        sourceId: recipe.id,
        unitCost,
        sellPrice: recipe.sellingPrice || 0,
      });
      onClose();
    } finally {
      setPickingId(null);
    }
  }

  async function pickMenu(item: MenuItem) {
    setPickingId(item.id);
    try {
      let unitCost =
        item.foodCostPct != null && item.price > 0 ? (item.price * item.foodCostPct) / 100 : 0;
      if (item.recipeId) {
        try {
          const fc = await kitchenApi.getFoodCost(item.recipeId);
          unitCost = fc.portionCost;
        } catch {
          /* keep estimate */
        }
      }
      onPick({
        name: item.name,
        sourceType: "menu",
        sourceId: item.id,
        unitCost,
        sellPrice: item.price,
      });
      onClose();
    } finally {
      setPickingId(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className={cn(GOLD_CARD, "flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden")}>
        <header className="flex items-center justify-between border-b border-rw-line/50 px-4 py-3">
          <h3 className="font-display text-base font-bold text-[#E8C547]">Aggiungi da ricetta o menu</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-rw-muted hover:bg-rw-surfaceAlt hover:text-rw-ink">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="border-b border-rw-line/40 px-4 py-3">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca piatto…"
              className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt py-2.5 pl-10 pr-3 text-sm text-rw-ink focus:border-[#D4AF37]/50 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("menu")}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold",
                tab === "menu"
                  ? "border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#E8C547]"
                  : "border-rw-line text-rw-muted",
              )}
            >
              <UtensilsCrossed className="h-4 w-4" /> Menu
            </button>
            <button
              type="button"
              onClick={() => setTab("recipe")}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold",
                tab === "recipe"
                  ? "border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#E8C547]"
                  : "border-rw-line text-rw-muted",
              )}
            >
              <BookOpen className="h-4 w-4" /> Ricette
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
            </div>
          ) : tab === "menu" ? (
            <ul className="space-y-2">
              {filteredMenu.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={pickingId === item.id}
                    onClick={() => void pickMenu(item)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-rw-line/50 bg-rw-surfaceAlt/60 px-3 py-3 text-left hover:border-[#D4AF37]/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-rw-ink">{item.name}</p>
                      <p className="text-xs text-rw-muted">{item.category} · € {item.price.toFixed(2)}</p>
                    </div>
                    {pickingId === item.id ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#D4AF37]" />
                    ) : (
                      <span className="shrink-0 text-xs font-bold text-[#E8C547]">Aggiungi</span>
                    )}
                  </button>
                </li>
              ))}
              {filteredMenu.length === 0 && (
                <p className="py-8 text-center text-sm text-rw-muted">Nessuna voce menu trovata.</p>
              )}
            </ul>
          ) : (
            <ul className="space-y-2">
              {filteredRecipes.map((recipe) => (
                <li key={recipe.id}>
                  <button
                    type="button"
                    disabled={pickingId === recipe.id}
                    onClick={() => void pickRecipe(recipe)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-rw-line/50 bg-rw-surfaceAlt/60 px-3 py-3 text-left hover:border-[#D4AF37]/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-rw-ink">{recipe.name}</p>
                      <p className="text-xs text-rw-muted">
                        {recipe.category} · vendita € {recipe.sellingPrice.toFixed(2)}
                      </p>
                    </div>
                    {pickingId === recipe.id ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#D4AF37]" />
                    ) : (
                      <span className="shrink-0 text-xs font-bold text-[#E8C547]">Aggiungi</span>
                    )}
                  </button>
                </li>
              ))}
              {filteredRecipes.length === 0 && (
                <p className="py-8 text-center text-sm text-rw-muted">Nessuna ricetta trovata.</p>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
