"use client";

import Link from "next/link";
import type { HotelReservation } from "@/lib/api-client";
import { useI18n } from "@/core/i18n/provider";
import { CARD, CARD_CLICK } from "./styles";

function boardLabel(board: HotelReservation["boardType"]): string {
  const map: Record<HotelReservation["boardType"], string> = {
    room_only: "Room only",
    bed_breakfast: "B&B",
    half_board: "MP",
    full_board: "PC",
  };
  return map[board] ?? board;
}

function GuestRow({ item, href }: { item: HotelReservation; href: string }) {
  const room = item.roomId?.replace(/^hr_/, "") ?? "—";
  return (
    <Link href={href} className={`${CARD_CLICK} block px-3 py-2.5`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold tabular-nums text-[#D4AF37]">—</span>
        <span className="min-w-0 flex-1 truncate font-semibold text-rw-ink">{item.guestName}</span>
        <span className="text-xs font-bold text-rw-muted">{room}</span>
      </div>
      <p className="mt-0.5 text-xs text-rw-muted">
        {item.roomType} · {boardLabel(item.boardType)}
      </p>
    </Link>
  );
}

type Props = {
  arrivals: HotelReservation[];
  departures: HotelReservation[];
};

export function HotelArrivalsDepartures({ arrivals, departures }: Props) {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col gap-4">
      <section className={`${CARD} flex flex-1 flex-col overflow-hidden p-4`}>
        <h2 className="mb-2 font-display text-base font-bold text-rw-ink">{t("hotel.enterprise.arrivalsToday")}</h2>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {arrivals.length === 0 ? (
            <p className="py-4 text-center text-sm text-rw-muted">{t("hotel.enterprise.noArrivals")}</p>
          ) : (
            arrivals.map((a) => <GuestRow key={a.id} item={a} href="/hotel/front-desk" />)
          )}
        </div>
      </section>

      <section className={`${CARD} flex flex-1 flex-col overflow-hidden p-4`}>
        <h2 className="mb-2 font-display text-base font-bold text-rw-ink">{t("hotel.enterprise.departuresToday")}</h2>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {departures.length === 0 ? (
            <p className="py-4 text-center text-sm text-rw-muted">{t("hotel.enterprise.noDepartures")}</p>
          ) : (
            departures.map((d) => <GuestRow key={d.id} item={d} href="/hotel/front-desk" />)
          )}
        </div>
      </section>
    </div>
  );
}
