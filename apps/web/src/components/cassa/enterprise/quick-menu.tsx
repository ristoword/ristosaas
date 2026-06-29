"use client";

import { useMemo, useState } from "react";
import { UtensilsCrossed, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import type { MenuItem as ApiMenuItem } from "@/lib/api-client";
import { CARD_BASE, GOLD_BTN, GOLD_BTN_ACTIVE } from "./styles";

const CATEGORY_TABS = [
  "Antipasti",
  "Primi",
  "Secondi",
  "Contorni",
  "Dolci",
  "Bevande",
  "Cocktail",
  "Vini",
  "Pizza",
  "Dessert",
] as const;

function matchCategory(itemCategory: string, tab: string): boolean {
  const c = itemCategory.toLowerCase();
  const t = tab.toLowerCase();
  if (c.includes(t) || t.includes(c)) return true;
  if (tab === "Dessert" && (c.includes("dolc") || c.includes("dessert"))) return true;
  if (tab === "Vini" && (c.includes("vin") || c.includes("cantina"))) return true;
  if (tab === "Pizza" && c.includes("pizz")) return true;
  if (tab === "Cocktail" && (c.includes("cocktail") || c.includes("aperit"))) return true;
  return false;
}

type Props = {
  menuItems: ApiMenuItem[];
  onProductTap: (item: ApiMenuItem) => void;
};

export function CassaQuickMenu({ menuItems, onProductTap }: Props) {
  const { t } = useI18n();
  const [activeCat, setActiveCat] = useState<string>(CATEGORY_TABS[0]);

  const filtered = useMemo(() => {
    const active = menuItems.filter((i) => i.active && matchCategory(i.category, activeCat));
    if (active.length > 0) return active;
    return menuItems.filter((i) => i.active).slice(0, 16);
  }, [menuItems, activeCat]);

  return (
    <section className={cn(CARD_BASE, "flex h-full min-h-0 flex-col p-3")}>
      <header className="mb-2 shrink-0">
        <h2 className="font-display text-base font-bold uppercase tracking-wide text-rw-ink">
          {t("cassa.enterprise.quickMenu")}
        </h2>
      </header>

      <div className="mb-2 flex shrink-0 gap-1 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORY_TABS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCat(cat)}
            className={cn(
              "shrink-0 rounded-xl border px-3 py-2 text-xs font-bold uppercase transition",
              activeCat === cat
                ? "border-[#D4AF37] bg-[#D4AF37]/20 text-[#E8C547]"
                : "border-rw-line bg-rw-surfaceAlt text-rw-muted hover:text-rw-soft",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
        {filtered.length === 0 ? (
          <p className="col-span-full py-8 text-center text-sm text-rw-muted">{t("cassa.menu.notFound")}</p>
        ) : (
          filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onProductTap(item)}
              className={cn(
                GOLD_BTN,
                "min-h-[100px] min-w-0 flex-col gap-1 p-2 text-left active:scale-[0.97]",
                !item.active && "opacity-50",
              )}
            >
              <div className="flex h-12 w-full items-center justify-center rounded-xl bg-rw-surfaceAlt/80">
                <UtensilsCrossed className="h-6 w-6 text-[#D4AF37]/60" />
              </div>
              <span className="line-clamp-2 w-full text-xs font-bold text-rw-ink">{item.name}</span>
              <span className="text-sm font-bold text-[#E8C547]">€ {item.price.toFixed(2)}</span>
              <div className="flex w-full flex-wrap gap-1">
                {item.notes && (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {item.notes.slice(0, 12)}
                  </span>
                )}
                {item.foodCostPct != null && (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                    <TrendingUp className="h-2.5 w-2.5" />
                    FC {item.foodCostPct}%
                  </span>
                )}
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[9px] font-bold",
                    item.active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400",
                  )}
                >
                  {item.active ? t("ui.active") : t("ui.inactive")}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
