"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { useHotel } from "@/components/hotel/hotel-context";

const monthDays = Array.from({ length: 14 }, (_, index) => {
  const day = 12 + index;
  return `2026-04-${String(day).padStart(2, "0")}`;
});

export function HotelPlannerPage() {
  const { rooms, reservations } = useHotel();

  const occupancy = useMemo(
    () =>
      rooms.map((room) => ({
        room,
        days: monthDays.map((day) => {
          const reservation = reservations.find(
            (item) =>
              item.roomId === room.id &&
              item.status !== "cancellata" &&
              item.status !== "no_show" &&
              item.checkInDate <= day &&
              item.checkOutDate > day,
          );
          return {
            day,
            reservation,
          };
        }),
      })),
    [rooms, reservations],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Planner Camere" subtitle="Vista mensile base in stile PMS per occupazione e disponibilità.">
        <Chip label="Camere" value={rooms.length} tone="accent" />
      </PageHeader>

      <Card title="Planner disponibilità" description="Ogni riga è una camera, ogni colonna un giorno del soggiorno.">
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[140px_repeat(14,minmax(0,1fr))] gap-2">
              <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs font-semibold uppercase tracking-wide text-rw-muted">
                Camera
              </div>
              {monthDays.map((day) => (
                <div key={day} className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-2 py-2 text-center text-xs font-semibold text-rw-muted">
                  {day.slice(-2)}
                </div>
              ))}

              {occupancy.map(({ room, days }) => (
                <>
                  <div key={`${room.id}-label`} className="rounded-xl border border-rw-line bg-rw-surface px-3 py-3 text-sm">
                    <p className="font-semibold text-rw-ink">{room.code}</p>
                    <p className="text-xs text-rw-muted">{room.roomType}</p>
                  </div>
                  {days.map(({ day, reservation }) => (
                    <div
                      key={`${room.id}-${day}`}
                      className={`rounded-xl border px-2 py-3 text-center text-[11px] font-semibold ${
                        reservation
                          ? "border-rw-accent/30 bg-rw-accent/10 text-rw-accent"
                          : "border-rw-line bg-rw-surfaceAlt text-rw-muted"
                      }`}
                    >
                      {reservation ? reservation.guestName.split(" ")[0] : "•"}
                    </div>
                  ))}
                </>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
