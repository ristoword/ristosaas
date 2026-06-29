"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { BedDouble, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HotelReservation, HotelRoom } from "@/lib/api-client";
import { useI18n } from "@/core/i18n/provider";
import { useHotel } from "@/components/hotel/hotel-context";
import { todayIso } from "@/lib/date-utils";
import { CARD } from "./styles";

/** Griglia PMS 5×5 — slot fissi per piano. */
const FLOOR_ROWS: { floor: number; codes: string[] }[] = [
  { floor: 1, codes: ["101", "102", "103", "104", "105"] },
  { floor: 2, codes: ["201", "202", "203", "204", "205"] },
  { floor: 3, codes: ["301", "302", "303", "304", "305"] },
  { floor: 4, codes: ["401", "402", "403", "404", "405"] },
  { floor: 5, codes: ["501", "502", "503", "504", "505"] },
];

type DisplayState =
  | "disponibile"
  | "occupata"
  | "da_pulire"
  | "manutenzione"
  | "fuori_servizio"
  | "prenotata_oggi"
  | "empty";

const STATE_STYLES: Record<DisplayState, string> = {
  disponibile: "bg-emerald-600/90 border-emerald-400/60 text-white",
  occupata: "bg-red-600/90 border-red-400/60 text-white",
  da_pulire: "bg-orange-500/90 border-orange-400/60 text-black",
  manutenzione: "bg-yellow-500/90 border-yellow-300/70 text-black",
  fuori_servizio: "bg-slate-600/80 border-slate-400/50 text-white",
  prenotata_oggi: "bg-blue-600/90 border-blue-400/60 text-white",
  empty: "bg-slate-800/40 border-white/10 text-rw-muted",
};

const STATE_LABEL: Record<DisplayState, string> = {
  disponibile: "Disponibile",
  occupata: "Occupata",
  da_pulire: "Da pulire",
  manutenzione: "Manutenzione",
  fuori_servizio: "Fuori servizio",
  prenotata_oggi: "Prenotata oggi",
  empty: "—",
};

const LEGEND_DOT: Record<DisplayState, string> = {
  disponibile: "bg-emerald-600 border-emerald-400",
  occupata: "bg-red-600 border-red-400",
  da_pulire: "bg-orange-500 border-orange-400",
  manutenzione: "bg-yellow-500 border-yellow-300",
  fuori_servizio: "bg-slate-600 border-slate-400",
  prenotata_oggi: "bg-blue-600 border-blue-400",
  empty: "bg-slate-800 border-white/10",
};

const LEGEND: DisplayState[] = [
  "disponibile",
  "occupata",
  "da_pulire",
  "manutenzione",
  "fuori_servizio",
  "prenotata_oggi",
];

function normalizeCode(code: string): string {
  return code.replace(/^hr_/i, "").trim();
}

function roomBySlotCode(rooms: HotelRoom[], slotCode: string): HotelRoom | undefined {
  return rooms.find((r) => normalizeCode(r.code) === slotCode);
}

function reservationForRoom(
  reservations: HotelReservation[],
  roomId: string,
  today: string,
): HotelReservation | undefined {
  return (
    reservations.find((r) => r.roomId === roomId && r.status === "in_casa") ??
    reservations.find(
      (r) => r.roomId === roomId && r.status === "confermata" && r.checkInDate === today,
    ) ??
    reservations.find((r) => r.roomId === roomId && r.checkInDate === today)
  );
}

function resolveDisplayState(
  room: HotelRoom | undefined,
  reservation: HotelReservation | undefined,
  today: string,
): DisplayState {
  if (!room) return "empty";
  if (
    reservation &&
    reservation.status === "confermata" &&
    reservation.checkInDate === today &&
    room.status !== "occupata"
  ) {
    return "prenotata_oggi";
  }
  switch (room.status) {
    case "libera":
    case "pulita":
      return "disponibile";
    case "occupata":
      return "occupata";
    case "da_pulire":
      return "da_pulire";
    case "manutenzione":
      return "manutenzione";
    case "fuori_servizio":
      return "fuori_servizio";
    default:
      return "disponibile";
  }
}

type RoomBadge = "vip" | "late" | "early" | "urgent" | "ai";

function roomBadges(
  room: HotelRoom,
  reservation: HotelReservation | undefined,
  urgentClean: boolean,
): RoomBadge[] {
  const badges: RoomBadge[] = [];
  const notes = reservation?.receptionNotes?.toLowerCase() ?? "";
  if (notes.includes("vip") || reservation?.packageName?.toLowerCase().includes("vip")) {
    badges.push("vip");
  }
  if (reservation?.lateCheckout) badges.push("late");
  if (reservation?.earlyCheckin) badges.push("early");
  if (urgentClean || room.status === "da_pulire") badges.push("urgent");
  if (notes.includes("ai") || notes.includes("sugger")) badges.push("ai");
  return badges.slice(0, 2);
}

const BADGE_LABEL: Record<RoomBadge, string> = {
  vip: "VIP",
  late: "Late out",
  early: "Early in",
  urgent: "HK",
  ai: "AI",
};

type SlotData = {
  slotCode: string;
  floor: number;
  room?: HotelRoom;
  reservation?: HotelReservation;
  displayState: DisplayState;
  badges: RoomBadge[];
  urgentClean: boolean;
};

type Props = {
  rooms: HotelRoom[];
  floors: number[];
};

export function HotelRoomMap({ rooms, floors: _floors }: Props) {
  const { t } = useI18n();
  const { reservations, housekeeping, refresh } = useHotel();
  const today = todayIso();

  const [floorFilter, setFloorFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<DisplayState | "all">("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const slots = useMemo((): SlotData[] => {
    const rows =
      floorFilter === "all"
        ? FLOOR_ROWS
        : FLOOR_ROWS.filter((row) => row.floor === floorFilter);

    return rows.flatMap((row) =>
      row.codes.map((slotCode) => {
        const room = roomBySlotCode(rooms, slotCode);
        const reservation = room ? reservationForRoom(reservations, room.id, today) : undefined;
        const urgentClean = room
          ? housekeeping.some(
              (hk) => hk.roomId === room.id && hk.status !== "done" && room.status === "da_pulire",
            )
          : false;
        const displayState = resolveDisplayState(room, reservation, today);
        const badges = room ? roomBadges(room, reservation, urgentClean) : [];

        return {
          slotCode,
          floor: row.floor,
          room,
          reservation,
          displayState,
          badges,
          urgentClean,
        };
      }),
    );
  }, [rooms, reservations, housekeeping, floorFilter, today]);

  const filteredSlots = useMemo(() => {
    const q = search.trim().toLowerCase();
    return slots.filter((slot) => {
      if (statusFilter !== "all" && slot.displayState !== statusFilter) return false;
      if (!q) return true;
      if (slot.slotCode.includes(q)) return true;
      if (slot.reservation?.guestName.toLowerCase().includes(q)) return true;
      if (slot.room?.roomType.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [slots, statusFilter, search]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  return (
    <section className={`${CARD} flex min-h-[320px] flex-col p-4 sm:min-h-[400px] sm:p-5 lg:min-h-[480px]`}>
      {/* Header mappa */}
      <div className="mb-4 shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-rw-ink">
            {t("hotel.enterprise.roomMap")}
          </h2>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 text-xs font-semibold text-rw-ink transition duration-200 hover:border-[#D4AF37]/40 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Aggiorna
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 text-sm text-rw-ink"
            value={floorFilter === "all" ? "all" : String(floorFilter)}
            onChange={(e) =>
              setFloorFilter(e.target.value === "all" ? "all" : Number(e.target.value))
            }
          >
            <option value="all">{t("hotel.enterprise.allFloors")}</option>
            {FLOOR_ROWS.map((row) => (
              <option key={row.floor} value={row.floor}>
                {t("hotel.enterprise.floor")} {row.floor}
              </option>
            ))}
          </select>

          <select
            className="h-9 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 text-sm text-rw-ink"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DisplayState | "all")}
          >
            <option value="all">Tutti gli stati</option>
            {LEGEND.map((s) => (
              <option key={s} value={s}>
                {STATE_LABEL[s]}
              </option>
            ))}
          </select>

          <div className="relative min-w-[140px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca camera…"
              className="h-9 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt pl-8 pr-3 text-sm text-rw-ink placeholder:text-rw-muted"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {LEGEND.map((state) => (
            <span key={state} className="inline-flex items-center gap-1.5 text-[11px] text-rw-muted">
              <span className={cn("h-3 w-3 rounded-sm border", LEGEND_DOT[state])} />
              {STATE_LABEL[state]}
            </span>
          ))}
        </div>
      </div>

      {/* Griglia camere */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="grid grid-cols-2 justify-items-center gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredSlots.map((slot) => (
            <RoomTile key={slot.slotCode} slot={slot} today={today} />
          ))}
        </div>
        {filteredSlots.length === 0 && (
          <p className="py-10 text-center text-sm text-rw-muted">Nessuna camera corrisponde ai filtri.</p>
        )}
      </div>
    </section>
  );
}

function RoomTile({ slot, today }: { slot: SlotData; today: string }) {
  const { room, reservation, displayState, badges, slotCode } = slot;
  const label = STATE_LABEL[displayState];
  const isEmpty = !room;

  const tooltip = [
    `Camera ${slotCode}`,
    room ? `Tipo: ${room.roomType}` : null,
    reservation ? `Ospite: ${reservation.guestName}` : null,
    reservation ? `Notti: ${reservation.nights}` : null,
    room?.status === "da_pulire" ? "Pulizia: richiesta" : null,
    reservation?.receptionNotes ? `Note: ${reservation.receptionNotes}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const inner = (
    <div
      className={cn(
        "group relative flex aspect-square w-full max-w-[5rem] flex-col items-center justify-center rounded-[12px] border p-1.5 shadow-sm transition duration-200 sm:max-w-[5.25rem] sm:p-2",
        STATE_STYLES[displayState],
        !isEmpty && "hover:scale-[1.03] active:scale-[0.98]",
        isEmpty && "cursor-default opacity-60",
      )}
      title={tooltip}
    >
      {badges.length > 0 && (
        <div className="absolute right-0.5 top-0.5 flex max-w-[72px] flex-wrap justify-end gap-0.5">
          {badges.map((b) => (
            <span
              key={b}
              className="rounded px-1 py-px text-[8px] font-bold leading-none bg-black/35 text-white backdrop-blur-sm"
            >
              {BADGE_LABEL[b]}
            </span>
          ))}
        </div>
      )}

      <BedDouble className="mb-0.5 h-5 w-5 shrink-0 opacity-90" strokeWidth={1.75} />
      <span className="text-base font-bold leading-none tabular-nums">{slotCode}</span>
      <span className="mt-0.5 max-w-full truncate text-[11px] leading-tight opacity-90">{label}</span>

      {reservation && displayState !== "empty" && (
        <span className="mt-0.5 max-w-full truncate text-[9px] leading-none opacity-80">
          {reservation.guestName.split(" ")[0]}
        </span>
      )}

      {reservation?.status === "confermata" && reservation.checkInDate === today && (
        <span className="text-[8px] leading-none opacity-75">IN {reservation.checkInDate.slice(5)}</span>
      )}
      {reservation?.checkOutDate === today && reservation.status === "in_casa" && (
        <span className="text-[8px] leading-none opacity-75">OUT {reservation.checkOutDate.slice(5)}</span>
      )}

      {/* Tooltip hover esteso */}
      {!isEmpty && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-44 -translate-x-1/2 rounded-xl border border-rw-line bg-rw-bg/95 p-2.5 text-left text-[10px] text-rw-soft shadow-lg group-hover:block">
          <p className="font-bold text-rw-ink">Camera {slotCode}</p>
          <p>Tipo: {room!.roomType}</p>
          {reservation && <p>Ospite: {reservation.guestName}</p>}
          {reservation && <p>Notti: {reservation.nights}</p>}
          <p>Pulizia: {room!.status === "da_pulire" ? "Urgente" : "OK"}</p>
          {reservation?.receptionNotes && <p>Note: {reservation.receptionNotes}</p>}
        </div>
      )}
    </div>
  );

  if (isEmpty) {
    return inner;
  }

  return (
    <Link href="/hotel/rooms" className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 rounded-[12px]">
      {inner}
    </Link>
  );
}
