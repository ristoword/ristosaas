"use client";

import { useEffect, useState } from "react";
import { Banknote, Sparkles, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import type { ReportTrendsSnapshot } from "@/lib/api-client";
import { KPI_BOX } from "./styles";

type Props = {
  tavoliDaChiudere: number;
  comandeServite: number;
  incassoSimulato: number;
  trends: ReportTrendsSnapshot | null;
  onAiOpen: () => void;
};

function KpiChip({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={cn(KPI_BOX, accent && "border-[#D4AF37]/40 bg-[#D4AF37]/10")}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-rw-muted">{label}</span>
      <span className={cn("font-display text-lg font-bold tabular-nums", accent ? "text-[#E8C547]" : "text-rw-ink")}>
        {value}
      </span>
    </div>
  );
}

export function CassaEnterpriseHeader({
  tavoliDaChiudere,
  comandeServite,
  incassoSimulato,
  trends,
  onAiOpen,
}: Props) {
  const { t } = useI18n();
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="rounded-2xl border border-rw-line/80 bg-gradient-to-r from-rw-surface via-rw-surfaceAlt/50 to-rw-surface p-4 shadow-sm lg:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/25 to-[#D4AF37]/5 shadow-[0_0_24px_rgba(212,175,55,0.12)]">
            <Banknote className="h-7 w-7 text-[#E8C547]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wide text-rw-ink lg:text-3xl">
              {t("cassa.title").toUpperCase()}
            </h1>
            <p className="text-sm text-rw-muted lg:text-base">{t("cassa.subtitle")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          <KpiChip label={t("cassa.chip.tablesToClose")} value={tavoliDaChiudere} />
          <KpiChip label={t("cassa.chip.ordersServed")} value={comandeServite} />
          <KpiChip
            label={t("cassa.chip.simulatedRevenue")}
            value={`€ ${incassoSimulato.toFixed(2)}`}
            accent
          />
          <KpiChip label={t("cassa.chip.trend7d")} value={`€ ${(trends?.week.revenue ?? 0).toFixed(2)}`} />
          <KpiChip label={t("cassa.chip.trend30d")} value={`€ ${(trends?.month.revenue ?? 0).toFixed(2)}`} />
          <KpiChip
            label={t("cassa.chip.forecast7d")}
            value={`€ ${(trends?.forecast.next7.projectedRevenue ?? 0).toFixed(2)}`}
          />

          <button
            type="button"
            onClick={onAiOpen}
            className="inline-flex min-h-[80px] min-w-[110px] items-center gap-2 rounded-2xl border-2 border-[#D4AF37]/50 bg-gradient-to-b from-[#D4AF37]/25 to-[#D4AF37]/5 px-5 text-base font-bold text-[#E8C547] shadow-[0_0_20px_rgba(212,175,55,0.15)] transition hover:border-[#D4AF37] hover:from-[#D4AF37]/35 active:scale-[0.98]"
          >
            <Sparkles className="h-5 w-5" />
            {t("cassa.ai.label").toUpperCase()}
          </button>

          <div className="flex min-h-[80px] flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-emerald-400">
              <Wifi className="h-3.5 w-3.5" /> Online
            </span>
            <span className="font-display text-xl font-bold tabular-nums text-rw-ink">{time}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
