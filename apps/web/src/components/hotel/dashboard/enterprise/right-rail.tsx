"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CloudSun,
  Sparkles,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import { CARD, CARD_CLICK } from "./styles";

type Props = {
  openHousekeeping: number;
  dirtyRooms: number;
  maintenanceCount: number;
  occupancyPct: number;
  revPar: number;
  onAiOpen: () => void;
};

export function HotelRightRail({
  openHousekeeping,
  dirtyRooms,
  maintenanceCount,
  occupancyPct,
  revPar,
  onAiOpen,
}: Props) {
  const { t } = useI18n();

  const alerts = [
    {
      href: "/hotel/housekeeping",
      icon: Sparkles,
      label: `${dirtyRooms} ${t("hotel.enterprise.alert.hkRooms")}`,
      tone: "text-amber-400",
    },
    {
      href: "/hotel/housekeeping",
      icon: Wrench,
      label: `${maintenanceCount} ${t("hotel.enterprise.alert.maintenanceShort")}`,
      tone: "text-red-400",
    },
    {
      href: "/hotel/front-desk",
      icon: Bell,
      label: `${openHousekeeping} ${t("hotel.enterprise.alert.hkOpenShort")}`,
      tone: "text-blue-400",
    },
    {
      href: "/hotel/reservations",
      icon: AlertTriangle,
      label: t("hotel.enterprise.alert.guestRequests"),
      tone: "text-[#E8C547]",
    },
  ];

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 xl:w-[320px]">
      <section className={`${CARD} p-5 text-center`}>
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-[#D4AF37]/5 ring-2 ring-[#D4AF37]/40">
          <Sparkles className="h-10 w-10 text-[#E8C547]" />
        </div>
        <h2 className="font-display text-lg font-bold text-rw-ink">{t("hotel.enterprise.aiConcierge")}</h2>
        <p className="mb-4 text-xs text-rw-muted">{t("hotel.enterprise.aiConcierge.sub")}</p>
        <button
          type="button"
          onClick={onAiOpen}
          className="w-full rounded-2xl border-2 border-[#D4AF37]/50 bg-[#D4AF37]/15 py-3 text-sm font-bold uppercase tracking-wide text-[#E8C547] transition duration-[180ms] hover:scale-[1.02] hover:bg-[#D4AF37]/25"
        >
          {t("hotel.enterprise.askAi")}
        </button>
      </section>

      <section className={`${CARD} p-4`}>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-rw-muted">
          {t("hotel.enterprise.alerts")}
        </h3>
        <ul className="space-y-2">
          {alerts.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.label}>
                <Link href={a.href} className={`${CARD_CLICK} flex items-start gap-3 px-3 py-2.5`}>
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", a.tone)} />
                  <span className="text-sm text-rw-soft">{a.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <Link href="/hotel/folio" className={`${CARD_CLICK} flex items-center gap-3 p-4`}>
        <CloudSun className="h-8 w-8 text-[#D4AF37]" />
        <div>
          <p className="text-sm font-bold text-rw-ink">{t("hotel.enterprise.weather")}</p>
          <p className="text-xs text-rw-muted">{t("hotel.enterprise.weather.sub")}</p>
        </div>
      </Link>

      <Link href="/hotel/folio" className={`${CARD_CLICK} flex items-center gap-3 p-4`}>
        <TrendingUp className="h-8 w-8 text-emerald-400" />
        <div>
          <p className="text-sm font-bold text-rw-ink">{t("hotel.enterprise.performance")}</p>
          <p className="text-xs text-rw-muted">
            {occupancyPct}% · RevPAR € {revPar.toFixed(0)}
          </p>
        </div>
      </Link>
    </aside>
  );
}
