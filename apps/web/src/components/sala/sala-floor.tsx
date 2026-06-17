"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { SalaTable, TableStatus } from "./types";
import { useI18n } from "@/core/i18n/provider";

const statoStyles: Record<
  TableStatus,
  { ring: string; bg: string }
> = {
  libero: {
    ring: "ring-emerald-400/60",
    bg: "bg-emerald-900/60 text-emerald-100",
  },
  aperto: {
    ring: "ring-rw-accent/70",
    bg: "bg-rw-accent/20 text-rw-ink",
  },
  conto: {
    ring: "ring-amber-400/80",
    bg: "bg-amber-900/50 text-amber-100",
  },
  sporco: {
    ring: "ring-slate-400/60",
    bg: "bg-slate-700/50 text-slate-200",
  },
};

type SalaFloorProps = {
  tables: SalaTable[];
  selectedId: string | null;
  onSelect: (t: SalaTable) => void;
  /** Editor layout: abilita drag and drop dei tavoli. */
  editMode?: boolean;
  /** Aggiornamento ottimistico locale della posizione durante drag. */
  onLocalMove?: (id: string, x: number, y: number) => void;
  /** Persistenza su backend al rilascio. */
  onCommitMove?: (id: string, x: number, y: number) => void | Promise<void>;
};

const MIN_COORD = 4;
const MAX_COORD = 96;

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(MAX_COORD, Math.max(MIN_COORD, value));
}

export function SalaFloor({
  tables,
  selectedId,
  onSelect,
  editMode = false,
  onLocalMove,
  onCommitMove,
}: SalaFloorProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Ultima posizione nota durante drag, per sapere dove salvare al rilascio.
  const lastPosRef = useRef<{ id: string; x: number; y: number } | null>(null);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, table: SalaTable) => {
      if (!editMode) return;
      event.preventDefault();
      event.stopPropagation();
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      setDraggingId(table.id);
      lastPosRef.current = { id: table.id, x: table.x, y: table.y };
    },
    [editMode],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, table: SalaTable) => {
      if (!editMode || draggingId !== table.id || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const xPct = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
      const yPct = clampPercent(((event.clientY - rect.top) / rect.height) * 100);
      lastPosRef.current = { id: table.id, x: xPct, y: yPct };
      onLocalMove?.(table.id, xPct, yPct);
    },
    [editMode, draggingId, onLocalMove],
  );

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, table: SalaTable) => {
      if (!editMode || draggingId !== table.id) return;
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
      const last = lastPosRef.current;
      setDraggingId(null);
      lastPosRef.current = null;
      if (last && (last.x !== table.x || last.y !== table.y)) {
        void onCommitMove?.(table.id, last.x, last.y);
      }
    },
    [editMode, draggingId, onCommitMove],
  );

  // Blocca scroll touch sul canvas mentre si trascina.
  useEffect(() => {
    if (!draggingId) return;
    const prev = document.body.style.overscrollBehavior;
    document.body.style.overscrollBehavior = "contain";
    return () => {
      document.body.style.overscrollBehavior = prev;
    };
  }, [draggingId]);

  return (
    <div
      ref={canvasRef}
      className={cn(
        "relative min-h-[min(72dvh,640px)] w-full overflow-hidden rounded-3xl border border-rw-line bg-rw-surfaceAlt shadow-inner",
        editMode && "ring-2 ring-rw-accent/40",
      )}
      style={{
        backgroundImage: `
          linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "24px 24px",
      }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/5" />

      {editMode ? (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-rw-accent/20 px-3 py-1 text-xs font-semibold text-rw-accent">
          {t("sala.floor.editModeHint")}
        </div>
      ) : null}

      {tables.map((tbl) => {
        const st = statoStyles[tbl.stato];
        const selected = selectedId === tbl.id;
        const isDragging = draggingId === tbl.id;
        return (
          <button
            key={tbl.id}
            type="button"
            onClick={() => {
              if (editMode) return; // in edit mode tap = noop (solo drag)
              onSelect(tbl);
            }}
            onPointerDown={(e) => handlePointerDown(e, tbl)}
            onPointerMove={(e) => handlePointerMove(e, tbl)}
            onPointerUp={(e) => endDrag(e, tbl)}
            onPointerCancel={(e) => endDrag(e, tbl)}
            style={{ left: `${tbl.x}%`, top: `${tbl.y}%` }}
            className={cn(
              "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center border-2 border-white/15 shadow-rw-sm transition",
              "min-h-[4.5rem] min-w-[4.5rem] touch-manipulation select-none sm:min-h-[5.25rem] sm:min-w-[5.25rem]",
              tbl.forma === "tondo" ? "rounded-full" : "rounded-2xl",
              st.bg,
              st.ring,
              selected && "z-10 ring-4 ring-rw-focus ring-offset-2 ring-offset-rw-surfaceAlt",
              editMode && "cursor-grab active:cursor-grabbing",
              isDragging && "z-20 scale-105 opacity-90 shadow-rw",
              !editMode && "active:scale-95",
            )}
            aria-label={
              editMode
                ? t("sala.floor.dragAriaLabel").replace("{name}", tbl.nome)
                : t("sala.floor.tableAriaLabel")
                    .replace("{name}", tbl.nome)
                    .replace("{label}", t(`sala.status.${tbl.stato}`))
                    .replace("{posti}", String(tbl.posti))
            }
            aria-pressed={selected}
          >
            <span className="font-display text-xl font-bold leading-none sm:text-2xl">
              {tbl.nome}
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">
              {tbl.posti} p
            </span>
          </button>
        );
      })}
    </div>
  );
}
