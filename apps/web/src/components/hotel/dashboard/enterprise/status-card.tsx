"use client";

import Link from "next/link";
import { useI18n } from "@/core/i18n/provider";
import { CARD, CARD_CLICK } from "./styles";

type Counts = {
  occupied: number;
  available: number;
  dirty: number;
  clean: number;
  ooo: number;
  maintenance: number;
};

const ROWS: Array<{ key: keyof Counts; href: string; tone: string; labelKey: string }> = [
  { key: "occupied", href: "/hotel/rooms", tone: "text-[#E8C547]", labelKey: "hotel.enterprise.status.occupied" },
  { key: "available", href: "/hotel/rooms", tone: "text-emerald-400", labelKey: "hotel.enterprise.status.available" },
  { key: "dirty", href: "/hotel/housekeeping", tone: "text-amber-400", labelKey: "hotel.enterprise.status.dirty" },
  { key: "clean", href: "/hotel/housekeeping", tone: "text-blue-400", labelKey: "hotel.enterprise.status.clean" },
  { key: "ooo", href: "/hotel/rooms", tone: "text-rw-muted", labelKey: "hotel.enterprise.status.ooo" },
  { key: "maintenance", href: "/hotel/housekeeping", tone: "text-red-400", labelKey: "hotel.enterprise.status.maintenance" },
];

export function HotelStatusCard({ counts }: { counts: Counts }) {
  const { t } = useI18n();

  return (
    <section className={`${CARD} flex h-full flex-col p-5`}>
      <h2 className="mb-4 font-display text-lg font-bold text-rw-ink">{t("hotel.dashboard.facility.title")}</h2>
      <ul className="flex flex-1 flex-col gap-2">
        {ROWS.map((row) => (
          <li key={row.key}>
            <Link
              href={row.href}
              className={`${CARD_CLICK} flex items-center justify-between px-4 py-3`}
            >
              <span className="text-sm font-medium text-rw-soft">{t(row.labelKey)}</span>
              <span className={`font-display text-2xl font-bold tabular-nums ${row.tone}`}>
                {counts[row.key]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
