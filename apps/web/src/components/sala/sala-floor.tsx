"use client";

import { cn } from "@/lib/utils";
import type { SalaTable, TableStatus } from "./types";

const statoStyles: Record<
  TableStatus,
  { ring: string; bg: string; label: string }
> = {
  libero: {
    ring: "ring-emerald-400/60",
    bg: "bg-emerald-900/60 text-emerald-100",
    label: "Libero",
  },
  aperto: {
    ring: "ring-rw-accent/70",
    bg: "bg-rw-accent/20 text-rw-ink",
    label: "Aperto",
  },
  conto: {
    ring: "ring-amber-400/80",
    bg: "bg-amber-900/50 text-amber-100",
    label: "Conto",
  },
  sporco: {
    ring: "ring-slate-400/60",
    bg: "bg-slate-700/50 text-slate-200",
    label: "Pulizia",
  },
};

type SalaFloorProps = {
  tables: SalaTable[];
  selectedId: string | null;
  onSelect: (t: SalaTable) => void;
};

export function SalaFloor({ tables, selectedId, onSelect }: SalaFloorProps) {
  return (
    <div
      className="relative min-h-[min(72dvh,640px)] w-full overflow-hidden rounded-3xl border border-rw-line bg-rw-surfaceAlt shadow-inner"
      style={{
        backgroundImage: `
          linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "24px 24px",
      }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/5" />

      {tables.map((t) => {
        const st = statoStyles[t.stato];
        const selected = selectedId === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
            className={cn(
              "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center border-2 border-white/15 shadow-rw-sm transition active:scale-95",
              "min-h-[4.5rem] min-w-[4.5rem] touch-manipulation select-none sm:min-h-[5.25rem] sm:min-w-[5.25rem]",
              t.forma === "tondo" ? "rounded-full" : "rounded-2xl",
              st.bg,
              st.ring,
              selected && "z-10 ring-4 ring-rw-focus ring-offset-2 ring-offset-rw-surfaceAlt",
            )}
            aria-label={`Tavolo ${t.nome}, ${st.label}, ${t.posti} posti. Tocca per aprire le azioni.`}
            aria-pressed={selected}
          >
            <span className="font-display text-xl font-bold leading-none sm:text-2xl">
              {t.nome}
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">
              {t.posti} p
            </span>
          </button>
        );
      })}
    </div>
  );
}
