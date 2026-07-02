"use client";

import { Plus, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuItem as ApiMenuItem } from "@/lib/api-client";

function foodCostTone(pct: number | null): "green" | "yellow" | "red" | null {
  if (pct == null) return null;
  if (pct < 30) return "green";
  if (pct <= 35) return "yellow";
  return "red";
}

const FC_TEXT: Record<NonNullable<ReturnType<typeof foodCostTone>>, string> = {
  green: "text-emerald-400",
  yellow: "text-amber-400",
  red: "text-red-400",
};

type ProductCardProps = {
  item: ApiMenuItem;
  onAdd: (item: ApiMenuItem) => void;
};

export function ProductCard({ item, onAdd }: ProductCardProps) {
  const fc = foodCostTone(item.foodCostPct);
  const priceLabel = item.price.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onAdd(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAdd(item);
        }
      }}
      className={cn(
        "flex h-[152px] w-full min-w-0 cursor-pointer flex-col rounded-xl border border-white/[0.08] bg-[#141A24] p-2.5 shadow-sm transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]",
        !item.active && "opacity-75",
      )}
    >
      <div className="flex min-h-0 items-start gap-1.5">
        <UtensilsCrossed
          className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]/80"
          strokeWidth={1.75}
          aria-hidden
        />
        <h3
          className="line-clamp-2 min-h-[2.25rem] flex-1 text-sm font-bold leading-snug text-white"
          title={item.name}
        >
          {item.name}
        </h3>
      </div>

      <div className="mt-auto flex flex-col gap-1 pt-2">
        <p className="truncate text-lg font-extrabold leading-none tabular-nums text-[#E8C547]">
          € {priceLabel}
        </p>

        {fc != null && item.foodCostPct != null ? (
          <p className={cn("truncate text-[10px] font-semibold leading-none", FC_TEXT[fc])}>
            FC {item.foodCostPct}%
          </p>
        ) : (
          <span className="h-[10px]" aria-hidden />
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAdd(item);
          }}
          className="flex h-8 w-full shrink-0 items-center justify-center gap-1 rounded-lg bg-emerald-600 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm transition-colors duration-150 hover:bg-emerald-500 active:scale-[0.98]"
        >
          <Plus className="h-3 w-3 shrink-0" aria-hidden />
          <span>AGGIUNGI</span>
        </button>
      </div>
    </article>
  );
}
