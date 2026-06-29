"use client";

import { useMemo, useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import type { MenuItem as ApiMenuItem } from "@/lib/api-client";
import { CARD_BASE } from "./styles";

const CATEGORY_TABS = [
  "Antipasti",
  "Primi",
  "Secondi",
  "Dolci",
  "Bevande",
  "Vini",
  "Cocktail",
] as const;

function matchCategory(itemCategory: string, tab: string): boolean {
  const c = itemCategory.toLowerCase();
  const t = tab.toLowerCase();
  if (c.includes(t) || t.includes(c)) return true;
  if (tab === "Dolci" && (c.includes("dolc") || c.includes("dessert") || c.includes("contorn"))) return true;
  if (tab === "Vini" && (c.includes("vin") || c.includes("cantina"))) return true;
  if (tab === "Cocktail" && (c.includes("cocktail") || c.includes("aperit"))) return true;
  if (tab === "Bevande" && (c.includes("bevand") || c.includes("bar"))) return true;
  return false;
}

function foodCostTone(pct: number | null): "green" | "yellow" | "red" | null {
  if (pct == null) return null;
  if (pct < 30) return "green";
  if (pct <= 35) return "yellow";
  return "red";
}

const FC_CLASSES = {
  green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  yellow: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  red: "bg-red-500/15 text-red-400 border-red-500/25",
} as const;

function statusBadge(item: ApiMenuItem): { label: string; className: string } {
  if (!item.active) {
    return { label: "Esaurito", className: "bg-red-500/15 text-red-400 border-red-500/25" };
  }
  const notes = item.notes?.toLowerCase() ?? "";
  if (notes.includes("promo")) {
    return { label: "Promo", className: "bg-[#D4AF37]/20 text-[#E8C547] border-[#D4AF37]/35" };
  }
  if (notes.includes("nuov")) {
    return { label: "Nuovo", className: "bg-sky-500/15 text-sky-400 border-sky-500/25" };
  }
  return { label: "Attivo", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" };
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
    return menuItems.filter((i) => i.active).slice(0, 24);
  }, [menuItems, activeCat]);

  return (
    <section
      className={cn(
        CARD_BASE,
        "flex h-full min-h-0 min-w-[12rem] flex-col overflow-hidden p-4 xl:min-w-[18rem]",
      )}
    >
      <header className="mb-3 shrink-0">
        <h2 className="font-display text-lg font-semibold tracking-wide text-rw-ink">
          {t("cassa.enterprise.quickMenu")}
        </h2>
      </header>

      <div className="mb-3 flex shrink-0 flex-wrap gap-2">
        {CATEGORY_TABS.map((cat) => {
          const isActive = activeCat === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCat(cat)}
              className={cn(
                "inline-flex h-[42px] items-center rounded-[12px] px-[18px] text-base font-semibold transition-all duration-150",
                isActive
                  ? "bg-[#D4AF37] text-black shadow-sm"
                  : "bg-[#1E2430] text-white hover:bg-[#252d3d]",
              )}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-rw-muted">{t("cassa.menu.notFound")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => {
              const fc = foodCostTone(item.foodCostPct);
              const status = statusBadge(item);

              return (
                <article
                  key={item.id}
                  className={cn(
                    "flex h-[150px] w-full max-w-[170px] flex-col rounded-2xl border border-white/[0.08] bg-[#141A24] p-[14px] shadow-sm transition-transform duration-150 hover:scale-[1.03]",
                    !item.active && "opacity-80",
                  )}
                >
                  <div className="flex min-h-0 flex-1 flex-col">
                    <UtensilsCrossed
                      className="mb-1.5 h-5 w-5 shrink-0 text-[#D4AF37]/70"
                      strokeWidth={1.75}
                    />

                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                      {item.name}
                    </h3>

                    <p className="mt-0.5 text-base font-bold tabular-nums text-[#E8C547]">
                      € {item.price.toFixed(2)}
                    </p>

                    <div className="mt-auto flex flex-wrap gap-1 pt-1">
                      {fc != null && item.foodCostPct != null && (
                        <span
                          className={cn(
                            "rounded-md border px-1.5 py-0.5 text-[10px] font-bold leading-none",
                            FC_CLASSES[fc],
                          )}
                        >
                          FC {item.foodCostPct}%
                        </span>
                      )}
                      <span
                        className={cn(
                          "rounded-md border px-1.5 py-0.5 text-[10px] font-bold leading-none",
                          status.className,
                        )}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onProductTap(item)}
                    className="mt-2 flex h-9 w-full shrink-0 items-center justify-center rounded-[10px] bg-emerald-600 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-all duration-150 hover:bg-emerald-500 active:scale-[0.98]"
                  >
                    {t("ui.add")}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
