"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Order } from "@/components/orders/types";
import type { SalaTable } from "@/lib/api-client";
import {
  computeTableSummary,
  formatElapsed,
  getItemDisplayStatus,
  groupOrderItems,
  itemStatusIcon,
  itemStatusPrefix,
  tableStatusLabel,
} from "./sala-order-display";

type SalaTableOrderPanelProps = {
  table: SalaTable;
  orders: Order[];
  onOpenActions?: () => void;
  className?: string;
};

function chipClass(stato: SalaTable["stato"]) {
  switch (stato) {
    case "libero":
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
    case "aperto":
      return "border-rw-accent/30 bg-rw-accent/15 text-rw-accentSoft";
    case "conto":
      return "border-amber-500/30 bg-amber-500/15 text-amber-300";
    default:
      return "border-slate-500/30 bg-slate-500/15 text-slate-300";
  }
}

export function SalaTableOrderPanel({
  table,
  orders,
  onOpenActions,
  className,
}: SalaTableOrderPanelProps) {
  const summary = useMemo(() => computeTableSummary(orders, table), [orders, table]);
  const sections = useMemo(() => groupOrderItems(orders), [orders]);
  const [, tick] = useState(0);

  const prevItemKeysRef = useRef<Set<string>>(new Set());
  const [highlightKeys, setHighlightKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const current = new Set(
      orders.flatMap((o) => o.items.map((i) => `${o.id}-${i.id}`)),
    );
    const prev = prevItemKeysRef.current;
    if (prev.size > 0) {
      const added = [...current].filter((k) => !prev.has(k));
      if (added.length > 0) {
        setHighlightKeys(new Set(added));
        const t = setTimeout(() => setHighlightKeys(new Set()), 2200);
        return () => clearTimeout(t);
      }
    }
    prevItemKeysRef.current = current;
  }, [orders]);

  const seatedLabel = formatElapsed(summary.seatedAt);
  const lastOrderLabel = formatElapsed(summary.lastOrderAt);

  const panelBody = (
    <>
      <header className="border-b border-rw-line/50 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-lg font-bold text-rw-ink">Tavolo {table.nome}</p>
            <p className="mt-0.5 text-xs text-rw-muted">
              Coperti: <span className="font-semibold text-rw-ink">{summary.covers}</span>
            </p>
            <p className="text-xs text-rw-muted">
              Tempo seduti: <span className="tabular-nums font-semibold text-rw-ink">{seatedLabel}</span>
            </p>
            {summary.waiter ? (
              <p className="mt-1 text-xs text-rw-muted">
                Cameriere: <span className="text-rw-ink">{summary.waiter}</span>
              </p>
            ) : null}
            {summary.notes ? (
              <p className="mt-1 text-xs text-rw-muted">
                Cliente / note: <span className="text-rw-ink">{summary.notes}</span>
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onOpenActions ? (
              <button
                type="button"
                onClick={onOpenActions}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-rw-line bg-rw-surfaceAlt px-2.5 text-[11px] font-semibold text-rw-ink hover:border-rw-accent/40"
                title="Azioni tavolo"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Azioni
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Stato</span>
          <p className="mt-1">
            <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", chipClass(table.stato))}>
              <span className="h-2 w-2 rounded-full bg-current opacity-80" />
              {tableStatusLabel(table.stato)}
            </span>
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 border-b border-rw-line/40 bg-rw-surfaceAlt/40 px-4 py-3 text-xs">
        <Stat label="Articoli" value={String(summary.itemCount)} />
        <Stat label="Portate servite" value={String(summary.servedCourses)} />
        <Stat label="In cucina" value={String(summary.kitchenCourses)} />
        <Stat label="Ultima comanda" value={lastOrderLabel} mono />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-rw-muted">Nessun ordine attivo per questo tavolo.</p>
        ) : sections.length === 0 ? (
          <p className="py-8 text-center text-sm text-rw-muted">Ordine senza articoli.</p>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <section key={section.key}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-rw-muted">
                  {section.label}
                </h3>
                <ul className="space-y-1">
                  {section.items.map(({ order, item, itemKey }) => {
                    const st = getItemDisplayStatus(order, item);
                    const highlighted = highlightKeys.has(itemKey);
                    return (
                      <li
                        key={itemKey}
                        className={cn(
                          "flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-500",
                          highlighted && "bg-rw-accent/15 ring-1 ring-rw-accent/40",
                        )}
                      >
                        <span className="mt-0.5 shrink-0 text-xs" title={st}>
                          {itemStatusIcon(st)}
                        </span>
                        <span className="shrink-0 text-rw-muted">{itemStatusPrefix(st)}</span>
                        <span className="min-w-0 flex-1 text-rw-ink">
                          {item.name}
                          <span className="text-rw-muted"> ×{item.qty}</span>
                        </span>
                        {item.price != null && item.price > 0 ? (
                          <span className="shrink-0 tabular-nums text-xs text-rw-muted">
                            €{(item.price * item.qty).toFixed(2)}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-rw-line/50 bg-rw-surfaceAlt/50 px-4 py-3 text-sm">
        <div className="flex justify-between text-rw-muted">
          <span>Totale articoli</span>
          <span className="font-semibold text-rw-ink">{summary.itemCount}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-rw-muted">Totale €</span>
          <span className="font-display text-lg font-bold tabular-nums text-rw-ink">
            €{summary.total.toFixed(2)}
          </span>
        </div>
        {summary.notes ? (
          <p className="mt-2 border-t border-rw-line/30 pt-2 text-xs text-rw-muted">
            <span className="font-semibold uppercase tracking-wide">Note</span>
            <br />
            {summary.notes}
          </p>
        ) : null}
      </footer>
    </>
  );

  return (
    <>
      {/* Desktop / tablet: sticky sidebar */}
      <aside
        className={cn(
          "hidden md:flex md:w-[min(100%,340px)] md:shrink-0 md:flex-col md:rounded-2xl md:border md:border-rw-line md:bg-rw-surface md:shadow-sm",
          "xl:sticky xl:top-4 xl:w-[min(100%,400px)] xl:max-h-[calc(100dvh-6rem)]",
          className,
        )}
        aria-label={`Ordine tavolo ${table.nome}`}
      >
        {panelBody}
      </aside>

      {/* Mobile: bottom sheet */}
      <aside
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex max-h-[min(58dvh,520px)] flex-col rounded-t-2xl border border-rw-line bg-rw-surface shadow-[0_-8px_32px_rgba(0,0,0,0.35)] md:hidden",
          className,
        )}
        aria-label={`Ordine tavolo ${table.nome}`}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-rw-line" />
        {panelBody}
      </aside>
    </>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-rw-line/40 bg-rw-surface px-2 py-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-rw-muted">{label}</p>
      <p className={cn("font-semibold text-rw-ink", mono && "tabular-nums")}>{value}</p>
    </div>
  );
}
