"use client";

import { UtensilsCrossed } from "lucide-react";
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
        "flex h-[180px] w-[118px] shrink-0 cursor-pointer flex-col gap-2 rounded-2xl border border-white/[0.08] bg-[#141A24] p-3 shadow-sm transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98]",
        !item.active && "opacity-75",
      )}
    >
      <UtensilsCrossed
        className="h-5 w-5 shrink-0 text-[#D4AF37]/75"
        strokeWidth={1.75}
        aria-hidden
      />

      <h3
        className="line-clamp-2 min-h-[2.5rem] text-base font-bold leading-tight text-white"
        title={item.name}
      >
        {item.name}
      </h3>

      <div className="flex min-h-0 flex-1 flex-col justify-end gap-1">
        <p className="text-2xl font-extrabold leading-none tabular-nums text-[#E8C547]">
          € {priceLabel}
        </p>

        {fc != null && item.foodCostPct != null && (
          <p className={cn("text-xs font-semibold leading-none", FC_TEXT[fc])}>
            FC {item.foodCostPct}%
          </p>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAdd(item);
          }}
          className="mt-1 flex h-9 w-full shrink-0 items-center justify-center gap-1 rounded-[10px] bg-emerald-600 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-colors duration-150 hover:bg-emerald-500 active:scale-[0.98]"
        >
          <span aria-hidden>+</span>
          <span>AGGIUNGI</span>
        </button>
      </div>
    </article>
  );
}
