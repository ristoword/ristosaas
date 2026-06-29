"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import type { MenuItem as ApiMenuItem } from "@/lib/api-client";
import { CARD_BASE } from "./styles";
import { ProductCard } from "./product-card";

const CATEGORY_TABS = [
  "Antipasti",
  "Primi",
  "Secondi",
  "Contorni",
  "Dolci",
  "Bevande",
  "Vini",
  "Cocktail",
] as const;

function matchCategory(itemCategory: string, tab: string): boolean {
  const c = itemCategory.toLowerCase();
  const t = tab.toLowerCase();
  if (c.includes(t) || t.includes(c)) return true;
  if (tab === "Dolci" && (c.includes("dolc") || c.includes("dessert"))) return true;
  if (tab === "Vini" && (c.includes("vin") || c.includes("cantina"))) return true;
  if (tab === "Cocktail" && (c.includes("cocktail") || c.includes("aperit"))) return true;
  if (tab === "Bevande" && (c.includes("bevand") || c.includes("bar"))) return true;
  if (tab === "Contorni" && c.includes("contorn")) return true;
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

      <div className="mb-3 -mx-1 shrink-0 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max gap-2">
          {CATEGORY_TABS.map((cat) => {
            const isActive = activeCat === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCat(cat)}
                className={cn(
                  "inline-flex min-h-[44px] shrink-0 items-center rounded-[12px] px-4 text-sm font-semibold transition-all duration-150 sm:px-[18px] sm:text-base",
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-rw-muted">{t("cassa.menu.notFound")}</p>
        ) : (
          <div className="grid grid-cols-2 justify-items-center gap-2 sm:grid-cols-3 md:grid-cols-[repeat(auto-fill,minmax(7.375rem,1fr))] xl:grid-cols-4">
            {filtered.map((item) => (
              <ProductCard key={item.id} item={item} onAdd={onProductTap} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
