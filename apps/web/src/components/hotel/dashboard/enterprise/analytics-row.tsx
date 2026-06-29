"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import { CARD, CARD_CLICK } from "./styles";
import { MiniBarChart, MiniDonutChart } from "./mini-charts";

type ReservationStats = {
  confirmed: number;
  pending: number;
  noShow: number;
  overbooking: number;
  waitlist: number;
};

type RevenueBreakdown = {
  rooms: number;
  restaurant: number;
  bar: number;
  spa: number;
  extra: number;
};

type Props = {
  reservationStats: ReservationStats;
  occupancy7: Array<{ date: string; value: number }>;
  occupancy30: Array<{ date: string; value: number }>;
  occupancy90: Array<{ date: string; value: number }>;
  revenueBreakdown: RevenueBreakdown;
};

export function HotelAnalyticsRow({
  reservationStats,
  occupancy7,
  occupancy30,
  occupancy90,
  revenueBreakdown,
}: Props) {
  const { t } = useI18n();
  const [occRange, setOccRange] = useState<"7" | "30" | "90">("7");

  const occData = occRange === "7" ? occupancy7 : occRange === "30" ? occupancy30 : occupancy90;

  const resRows = [
    { key: "confirmed", href: "/hotel/reservations", labelKey: "hotel.enterprise.res.confirmed", value: reservationStats.confirmed },
    { key: "pending", href: "/hotel/reservations", labelKey: "hotel.enterprise.res.pending", value: reservationStats.pending },
    { key: "noShow", href: "/hotel/reservations", labelKey: "hotel.enterprise.res.noShow", value: reservationStats.noShow },
    { key: "overbooking", href: "/hotel/planner", labelKey: "hotel.enterprise.res.overbooking", value: reservationStats.overbooking },
    { key: "waitlist", href: "/hotel/reservations", labelKey: "hotel.enterprise.res.waitlist", value: reservationStats.waitlist },
  ] as const;

  const donutSegments = [
    { label: t("hotel.enterprise.rev.rooms"), value: revenueBreakdown.rooms, color: "#D4AF37" },
    { label: t("hotel.enterprise.rev.bar"), value: revenueBreakdown.bar, color: "#f59e0b" },
    { label: t("hotel.enterprise.rev.restaurant"), value: revenueBreakdown.restaurant, color: "#10b981" },
    { label: t("hotel.enterprise.rev.spa"), value: revenueBreakdown.spa, color: "#8b5cf6" },
    { label: t("hotel.enterprise.rev.extra"), value: revenueBreakdown.extra, color: "#64748b" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 xl:gap-5">
      <section className={`${CARD} p-5`}>
        <h2 className="mb-3 font-display text-lg font-bold text-rw-ink">{t("hotel.enterprise.reservations")}</h2>
        <ul className="space-y-2">
          {resRows.map((row) => (
            <li key={row.key}>
              <Link href={row.href} className={`${CARD_CLICK} flex items-center justify-between px-4 py-3`}>
                <span className="text-sm text-rw-soft">{t(row.labelKey)}</span>
                <span className="font-display text-xl font-bold tabular-nums text-rw-ink">{row.value}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${CARD} p-5`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-rw-ink">{t("hotel.enterprise.occupancyChart")}</h2>
          <div className="flex gap-1 rounded-lg border border-rw-line p-0.5">
            {(["7", "30", "90"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setOccRange(r)}
                className={cn(
                  "min-h-[36px] rounded-md px-2.5 py-1.5 text-xs font-bold transition duration-[180ms] sm:min-h-[44px]",
                  occRange === r ? "bg-[#D4AF37]/25 text-[#E8C547]" : "text-rw-muted hover:text-rw-soft",
                )}
              >
                {r}g
              </button>
            ))}
          </div>
        </div>
        <MiniBarChart data={occRange === "90" ? occData.filter((_, i) => i % 3 === 0) : occData} />
      </section>

      <section className={`${CARD} p-5`}>
        <h2 className="mb-3 font-display text-lg font-bold text-rw-ink">{t("hotel.enterprise.revenueChart")}</h2>
        <MiniDonutChart segments={donutSegments} />
      </section>
    </div>
  );
}
