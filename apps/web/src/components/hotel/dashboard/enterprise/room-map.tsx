"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { HotelRoom, HotelRoomStatus } from "@/lib/api-client";
import { useI18n } from "@/core/i18n/provider";
import { CARD } from "./styles";

const STATUS_COLOR: Record<HotelRoomStatus, string> = {
  libera: "bg-emerald-500/80 border-emerald-400/50 text-white",
  occupata: "bg-[#D4AF37]/90 border-[#E8C547]/60 text-black",
  da_pulire: "bg-amber-500/80 border-amber-400/50 text-black",
  pulita: "bg-blue-500/80 border-blue-400/50 text-white",
  fuori_servizio: "bg-slate-500/70 border-slate-400/40 text-white",
  manutenzione: "bg-red-500/80 border-red-400/50 text-white",
};

type Props = {
  rooms: HotelRoom[];
  floors: number[];
};

export function HotelRoomMap({ rooms, floors }: Props) {
  const { t } = useI18n();
  const [floor, setFloor] = useState<number | "all">("all");

  const visible = useMemo(() => {
    if (floor === "all") return rooms;
    return rooms.filter((r) => r.floor === floor);
  }, [rooms, floor]);

  return (
    <section className={`${CARD} flex h-full min-h-[320px] flex-col p-5`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-rw-ink">{t("hotel.enterprise.roomMap")}</h2>
        <select
          className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink"
          value={floor === "all" ? "all" : String(floor)}
          onChange={(e) => setFloor(e.target.value === "all" ? "all" : Number(e.target.value))}
        >
          <option value="all">{t("hotel.enterprise.allFloors")}</option>
          {floors.map((f) => (
            <option key={f} value={f}>
              {t("hotel.enterprise.floor")} {f}
            </option>
          ))}
        </select>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6 md:grid-cols-8">
        {visible.map((room) => (
          <Link
            key={room.id}
            href="/hotel/rooms"
            title={`${room.code} · ${room.status}`}
            className={cn(
              "flex min-h-[52px] items-center justify-center rounded-xl border text-sm font-bold transition duration-[180ms] hover:scale-105 hover:shadow-md active:scale-95",
              STATUS_COLOR[room.status],
            )}
          >
            {room.code.replace(/^hr_/, "")}
          </Link>
        ))}
      </div>
    </section>
  );
}
