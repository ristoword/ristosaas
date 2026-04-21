"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Minimize2,
  Users,
  Clock,
  ShoppingBag,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tablesApi, ordersApi } from "@/lib/api-client";
import type { SalaTable, TableStatus } from "@/lib/api-client";

const statusColors: Record<TableStatus, string> = {
  libero: "border-emerald-500 bg-emerald-500/20 text-emerald-300",
  aperto: "border-red-500 bg-red-500/20 text-red-300",
  conto: "border-amber-500 bg-amber-500/20 text-amber-300",
  sporco: "border-blue-500 bg-blue-500/20 text-blue-300",
};

const statusLabels: Record<TableStatus, string> = {
  libero: "Libero",
  aperto: "Occupato",
  conto: "Conto",
  sporco: "Prenotato",
};

type TableOrder = { items: string[]; total: number };

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function SalaFullscreenPage() {
  const router = useRouter();
  const now = useClock();
  const [selected, setSelected] = useState<SalaTable | null>(null);
  const [tables, setTables] = useState<SalaTable[]>([]);
  const [ordersByTable, setOrdersByTable] = useState<Record<string, TableOrder>>({});

  useEffect(() => {
    tablesApi.list().then(setTables).catch(console.error);

    ordersApi.list({ active: true }).then((orders) => {
      const map: Record<string, TableOrder> = {};
      for (const o of orders) {
        if (!o.table) continue;
        map[o.table] = {
          items: o.items.map((i) => i.name),
          total: o.items.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0),
        };
      }
      setOrdersByTable(map);
    }).catch(console.error);
  }, []);

  const counts = tables.reduce(
    (acc, t) => {
      acc[t.stato] = (acc[t.stato] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Gli ordini sono indicizzati per nome tavolo (o.table, es. "T1") perche
  // l'API ordini usa il nome nel campo table, non l'id del record.
  const selectedOrder = selected ? ordersByTable[selected.nome] : undefined;

  async function handleExitFullscreen() {
    if (typeof document !== "undefined" && document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }
    router.push("/rooms");
  }

  return (
    <div className="flex h-dvh flex-col bg-rw-bg">
      {/* top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-rw-line bg-rw-surface px-4 py-3">
        <div className="flex items-center gap-4">
          <Clock className="h-5 w-5 text-rw-accent" />
          <span className="font-display text-lg font-semibold tabular-nums text-rw-ink">
            {now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {(["libero", "aperto", "conto", "sporco"] as TableStatus[]).map((s) => (
            <span key={s} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", statusColors[s])}>
              {statusLabels[s]} {counts[s] ?? 0}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={handleExitFullscreen}
          className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink hover:border-rw-accent/30 hover:text-rw-accent"
        >
          <Minimize2 className="h-4 w-4" />
          Esci fullscreen
        </button>
      </header>

      {/* table grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {tables.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t)}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-3xl border-2 p-6 transition active:scale-[0.97]",
                statusColors[t.stato],
                t.forma === "tondo" && "aspect-square rounded-full",
              )}
            >
              <span className="font-display text-4xl font-bold">{t.nome}</span>
              <span className="flex items-center gap-1 text-sm opacity-80">
                <Users className="h-4 w-4" />
                {t.posti}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide">
                {statusLabels[t.stato]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* order summary overlay */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className="w-full max-w-sm rounded-3xl border border-rw-line bg-rw-surface p-6 shadow-rw">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Tavolo</p>
                <h2 className="font-display text-3xl font-bold text-rw-ink">{selected.nome}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rw-line bg-rw-surfaceAlt text-rw-ink"
                aria-label="Chiudi"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <span className={cn("mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold", statusColors[selected.stato])}>
              {statusLabels[selected.stato]}
            </span>

            {selectedOrder ? (
              <div className="mt-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-rw-ink">
                  <ShoppingBag className="h-4 w-4 text-rw-accent" /> Riepilogo ordine
                </p>
                <ul className="space-y-1">
                  {selectedOrder.items.map((item, i) => (
                    <li key={i} className="text-sm text-rw-soft">{item}</li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-rw-line pt-3 text-right font-display text-xl font-bold text-rw-ink">
                  € {selectedOrder.total.toFixed(2)}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-rw-muted">Nessun ordine attivo.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
