"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { useHotel } from "@/components/hotel/hotel-context";
import { addDaysIso, todayIso } from "@/lib/date-utils";
import { useI18n } from "@/core/i18n/provider";

const DEFAULT_WINDOW_DAYS = 14;

function buildRange(startIso: string, days: number): string[] {
  return Array.from({ length: days }, (_, idx) => addDaysIso(startIso, idx));
}

export function HotelPlannerPage() {
  const { rooms, reservations } = useHotel();
  const { t } = useI18n();
  const [anchor, setAnchor] = useState<string>(() => todayIso());
  const [windowDays, setWindowDays] = useState<number>(DEFAULT_WINDOW_DAYS);

  const days = useMemo(() => buildRange(anchor, windowDays), [anchor, windowDays]);

  const occupancy = useMemo(
    () =>
      rooms.map((room) => ({
        room,
        days: days.map((day) => {
          const reservation = reservations.find(
            (item) =>
              item.roomId === room.id &&
              item.status !== "cancellata" &&
              item.status !== "no_show" &&
              item.checkInDate <= day &&
              item.checkOutDate > day,
          );
          return { day, reservation };
        }),
      })),
    [rooms, reservations, days],
  );

  const totalCells = rooms.length * windowDays;
  const occupiedCells = occupancy.reduce(
    (sum, row) => sum + row.days.filter((d) => d.reservation).length,
    0,
  );
  const occupancyPct = totalCells > 0 ? Math.round((occupiedCells / totalCells) * 100) : 0;

  const firstColClass = "w-[140px] shrink-0";
  const dayColClass = "w-[72px] shrink-0";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("hotel.planner.title")}
        subtitle={t("hotel.planner.subtitle")}
      >
        <Chip label={t("hotel.planner.chip.rooms")} value={rooms.length} tone="accent" />
        <Chip label={t("hotel.planner.chip.window")} value={`${windowDays}g`} tone="info" />
        <Chip label={t("hotel.planner.chip.occupancy")} value={`${occupancyPct}%`} tone={occupancyPct > 60 ? "success" : "default"} />
      </PageHeader>

      <Card
        title={t("hotel.planner.card.title")}
        description={t("hotel.planner.card.desc")}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAnchor(addDaysIso(anchor, -7))}
            className="inline-flex items-center gap-1 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink"
          >
            <ChevronLeft className="h-4 w-4" /> -7g
          </button>
          <button
            type="button"
            onClick={() => setAnchor(todayIso())}
            className="inline-flex items-center gap-1 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink"
          >
            <RotateCcw className="h-4 w-4" /> {t("hotel.planner.today")}
          </button>
          <button
            type="button"
            onClick={() => setAnchor(addDaysIso(anchor, 7))}
            className="inline-flex items-center gap-1 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink"
          >
            +7g <ChevronRight className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={anchor}
            onChange={(e) => setAnchor(e.target.value || todayIso())}
            className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink"
          />
          <label className="ml-auto flex items-center gap-2 text-sm text-rw-muted">
            {t("hotel.planner.window_label")}
            <select
              className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink"
              value={windowDays}
              onChange={(e) => setWindowDays(parseInt(e.target.value, 10) || DEFAULT_WINDOW_DAYS)}
            >
              <option value={7}>{t("hotel.planner.days.7")}</option>
              <option value={14}>{t("hotel.planner.days.14")}</option>
              <option value={30}>{t("hotel.planner.days.30")}</option>
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-2">
            <div className="flex gap-2">
              <div
                className={`${firstColClass} rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs font-semibold uppercase tracking-wide text-rw-muted`}
              >
                {t("hotel.planner.room_col")}
              </div>
              {days.map((day) => {
                const isToday = day === todayIso();
                return (
                  <div
                    key={day}
                    className={`${dayColClass} rounded-xl border px-2 py-2 text-center text-[11px] font-semibold ${
                      isToday
                        ? "border-rw-accent/50 bg-rw-accent/10 text-rw-accent"
                        : "border-rw-line bg-rw-surfaceAlt text-rw-muted"
                    }`}
                  >
                    {day.slice(-2)}
                  </div>
                );
              })}
            </div>

            {occupancy.map(({ room, days: roomDays }) => (
              <div key={room.id} className="flex gap-2">
                <div className={`${firstColClass} rounded-xl border border-rw-line bg-rw-surface px-3 py-3 text-sm`}>
                  <p className="font-semibold text-rw-ink">{room.code}</p>
                  <p className="text-xs text-rw-muted">{room.roomType}</p>
                </div>
                {roomDays.map(({ day, reservation }) => (
                  <div
                    key={`${room.id}-${day}`}
                    className={`${dayColClass} rounded-xl border px-2 py-3 text-center text-[11px] font-semibold ${
                      reservation
                        ? "border-rw-accent/30 bg-rw-accent/10 text-rw-accent"
                        : "border-rw-line bg-rw-surfaceAlt text-rw-muted"
                    }`}
                    title={reservation ? `${reservation.guestName} · ${reservation.status}` : t("hotel.planner.free")}
                  >
                    {reservation ? reservation.guestName.split(" ")[0] : "•"}
                  </div>
                ))}
              </div>
            ))}

            {occupancy.length === 0 && (
              <p className="py-6 text-center text-sm text-rw-muted">
                {t("hotel.planner.empty")}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
