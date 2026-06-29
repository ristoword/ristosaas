"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/core/i18n/provider";
import { useAuth } from "@/components/auth/auth-context";
import { KPI_GRID } from "@/components/shared/ui-classes";
import { KPI_HEADER } from "./styles";
import { PRODUCT_BRAND, displayPropertyName } from "./display-labels";

type Metrics = {
  occupancyPct: number;
  adr: number;
  revPar: number;
  todayRevenue: number;
  occupiedRooms: number;
  availableRooms: number;
  arrivalsToday: Array<unknown>;
  departuresToday: Array<unknown>;
  openHousekeeping: number;
  inHouseCount: number;
  totalRooms: number;
};

type Props = {
  metrics: Metrics;
  onAiOpen: () => void;
};

const KPI_LINKS: Array<{ key: keyof Metrics | "arrivals" | "departures"; href: string; format: (m: Metrics) => string }> = [
  { key: "occupancyPct", href: "/hotel/rooms", format: (m) => `${m.occupancyPct}%` },
  { key: "adr", href: "/hotel/reservations", format: (m) => `€ ${m.adr.toFixed(0)}` },
  { key: "revPar", href: "/hotel/folio", format: (m) => `€ ${m.revPar.toFixed(0)}` },
  { key: "todayRevenue", href: "/hotel/folio", format: (m) => `€ ${m.todayRevenue.toLocaleString("it-IT", { maximumFractionDigits: 0 })}` },
  { key: "occupiedRooms", href: "/hotel/rooms", format: (m) => `${m.occupiedRooms}/${m.totalRooms}` },
  { key: "availableRooms", href: "/hotel/rooms", format: (m) => String(m.availableRooms) },
  { key: "arrivals", href: "/hotel/front-desk", format: (m) => String(m.arrivalsToday.length) },
  { key: "departures", href: "/hotel/front-desk", format: (m) => String(m.departuresToday.length) },
  { key: "openHousekeeping", href: "/hotel/housekeeping", format: (m) => String(m.openHousekeeping) },
];

const LABEL_KEYS = [
  "hotel.enterprise.kpi.occupancy",
  "hotel.kpi.adr",
  "hotel.kpi.revpar",
  "hotel.enterprise.kpi.revenueToday",
  "hotel.enterprise.kpi.occupied",
  "hotel.enterprise.kpi.available",
  "hotel.kpi.arrivals",
  "hotel.kpi.departures",
  "hotel.kpi.housekeeping",
] as const;

export function HotelEnterpriseHeader({ metrics, onAiOpen }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();

  return (
    <header className="rounded-[18px] border border-rw-line/70 bg-gradient-to-r from-rw-surface via-rw-surfaceAlt/40 to-rw-surface p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-rw-muted">
            {t("hotel.enterprise.welcome")}, <span className="font-semibold text-rw-ink">{user?.name ?? "—"}</span>
          </p>
          <h1 className="font-display text-2xl font-bold text-rw-ink lg:text-3xl">
            {PRODUCT_BRAND}
          </h1>
          <p className="text-sm text-rw-muted">{t("hotel.enterprise.controlCenter")}</p>
        </div>
        <button
          type="button"
          onClick={onAiOpen}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#D4AF37]/50 bg-gradient-to-b from-[#D4AF37]/25 to-[#D4AF37]/5 px-5 text-sm font-bold uppercase tracking-wide text-[#E8C547] shadow-[0_0_20px_rgba(212,175,55,0.12)] transition duration-[180ms] hover:scale-[1.02] hover:border-[#D4AF37] sm:w-auto lg:hidden"
        >
          <Sparkles className="h-5 w-5" />
          {t("hotel.enterprise.aiConcierge")}
        </button>
      </div>

      <div className={KPI_GRID}>
        {KPI_LINKS.map((item, idx) => (
          <Link key={item.key} href={item.href} className={`${KPI_HEADER} group`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rw-muted group-hover:text-[#D4AF37]/80">
              {t(LABEL_KEYS[idx])}
            </span>
            <span className="font-display text-xl font-bold tabular-nums text-rw-ink group-hover:text-[#E8C547] sm:text-2xl">
              {item.format(metrics)}
            </span>
          </Link>
        ))}
      </div>
    </header>
  );
}
