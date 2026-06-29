"use client";

import { useMemo, useState } from "react";
import {
  FolderOpen,
  GitBranch,
  Plus,
  Receipt,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import type { Order } from "@/lib/api-client";
import { CARD_BASE, TOUCH_BTN_SM } from "./styles";

type GroupedTables = Map<string, Order[]>;

function formatOccupation(orders: Order[]): string {
  const oldest = orders.reduce((min, o) => (o.createdAt < min ? o.createdAt : min), orders[0]?.createdAt ?? "");
  if (!oldest) return "—";
  const mins = Math.floor((Date.now() - new Date(oldest).getTime()) / 60_000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function tableStatus(orders: Order[]): { label: string; tone: string } {
  const hasBill = orders.some((o) => o.status === "conto_richiesto");
  if (hasBill) return { label: "Conto richiesto", tone: "border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#E8C547]" };
  return { label: "Servito", tone: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400" };
}

type Props = {
  grouped: GroupedTables;
  selectedTable: string | null;
  onSelectTable: (table: string) => void;
  onFlash: (msg: string) => void;
  openOrdersCount: number;
};

export function CassaTableGrid({
  grouped,
  selectedTable,
  onSelectTable,
  onFlash,
  openOrdersCount,
}: Props) {
  const { t } = useI18n();

  const entries = useMemo(() => [...grouped.entries()], [grouped]);

  return (
    <section className={cn(CARD_BASE, "flex h-full min-h-0 flex-col p-4")}>
      <header className="mb-3 shrink-0">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-rw-ink">
          {t("cassa.tables.title")}
        </h2>
        <p className="text-xs text-rw-muted">{t("cassa.tables.selectDesc")}</p>
      </header>

      {entries.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-center text-sm text-rw-muted">
          {t("cassa.tables.empty")}
        </p>
      ) : (
        <div className="grid flex-1 auto-rows-fr grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
          {entries.map(([table, ords]) => {
            const status = tableStatus(ords);
            const covers = ords.reduce((s, o) => s + (o.covers ?? 0), 0) || (ords[0]?.covers ?? 0);
            const isSelected = selectedTable === table;
            return (
              <button
                key={table}
                type="button"
                onClick={() => onSelectTable(table)}
                className={cn(
                  "flex min-h-[80px] flex-col items-start justify-between rounded-2xl border p-3 text-left transition-all duration-200 active:scale-[0.98]",
                  isSelected
                    ? "border-[#D4AF37] bg-[#D4AF37]/15 shadow-[0_0_16px_rgba(212,175,55,0.2)]"
                    : "border-rw-line bg-rw-surfaceAlt hover:border-[#D4AF37]/40",
                )}
              >
                <span className="font-display text-base font-bold text-rw-ink">
                  {table === "asporto" ? t("cassa.asporto") : `${t("ui.table")} ${table}`}
                </span>
                <span className="flex items-center gap-1 text-sm text-rw-muted">
                  <Users className="h-3.5 w-3.5" /> {covers || "—"}
                </span>
                <span className={cn("rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase", status.tone)}>
                  {status.label}
                </span>
                <span className="text-[10px] text-rw-muted">{formatOccupation(ords)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 grid shrink-0 grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onFlash(t("cassa.enterprise.newBill.flash"))}
          className={`${TOUCH_BTN_SM} border border-rw-line bg-rw-surfaceAlt text-rw-ink hover:border-[#D4AF37]/40`}
        >
          <Plus className="h-6 w-6 text-[#D4AF37]" />
          <span className="text-xs uppercase">{t("cassa.enterprise.newBill")}</span>
        </button>
        <button
          type="button"
          onClick={() => onFlash(t("cassa.enterprise.openBills.flash"))}
          className={`${TOUCH_BTN_SM} relative border border-rw-line bg-rw-surfaceAlt text-rw-ink hover:border-[#D4AF37]/40`}
        >
          <FolderOpen className="h-6 w-6 text-[#D4AF37]" />
          <span className="text-xs uppercase">{t("cassa.enterprise.openBills")}</span>
          {openOrdersCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#D4AF37] text-xs font-bold text-black">
              {openOrdersCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onFlash(t("cassa.enterprise.split.flash"))}
          className={`${TOUCH_BTN_SM} border border-rw-line bg-rw-surfaceAlt text-rw-ink hover:border-[#D4AF37]/40`}
        >
          <GitBranch className="h-6 w-6 text-[#D4AF37]" />
          <span className="text-xs uppercase">{t("cassa.enterprise.split")}</span>
        </button>
      </div>
    </section>
  );
}

export function CassaBillEmptyState() {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-rw-muted">
      <Receipt className="h-16 w-16 opacity-30" />
      <p className="text-base font-medium">{t("cassa.noTableSelected")}</p>
    </div>
  );
}
