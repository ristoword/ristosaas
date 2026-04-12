"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { useHotel } from "@/components/hotel/hotel-context";
import type { HotelRoom } from "@/lib/api-client";
import { hotelStays } from "@/modules/hotel/domain/mock-data";
import { isRoomAvailableForRange } from "@/modules/hotel/domain/availability";

const roomTone = {
  libera: "success",
  occupata: "danger",
  da_pulire: "warn",
  pulita: "info",
  fuori_servizio: "default",
  manutenzione: "default",
} as const;

export function HotelRoomsPage() {
  const { rooms, reservations, housekeeping, createRoom, updateRoom, deleteRoom } = useHotel();
  const [calendarStart, setCalendarStart] = useState("2026-04-12");
  const [calendarEnd, setCalendarEnd] = useState("2026-04-13");
  const [form, setForm] = useState<Omit<HotelRoom, "id">>({ code: "", floor: 1, capacity: 2, roomType: "Classic", status: "libera" });
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  const availableToday = rooms.filter((room) =>
    isRoomAvailableForRange(room, reservations, hotelStays, calendarStart, calendarEnd),
  ).length;

  const calendarRows = useMemo(
    () =>
      rooms.map((room) => ({
        ...room,
        available: isRoomAvailableForRange(room, reservations, hotelStays, calendarStart, calendarEnd),
      })),
    [rooms, reservations, calendarStart, calendarEnd],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Camere" subtitle="Disponibilità reale, stato operativo e housekeeping.">
        <Chip label="Disponibili oggi" value={availableToday} tone="success" />
        <Chip label="Totale camere" value={rooms.length} tone="accent" />
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card title="Nuova camera" description="CRUD base del verticale hotel.">
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" placeholder="Numero camera" value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
            <input type="number" min="0" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" placeholder="Piano" value={form.floor} onChange={(e) => setForm((prev) => ({ ...prev, floor: parseInt(e.target.value, 10) || 0 }))} />
            <input type="number" min="1" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" placeholder="Capienza" value={form.capacity} onChange={(e) => setForm((prev) => ({ ...prev, capacity: parseInt(e.target.value, 10) || 1 }))} />
            <input className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" placeholder="Tipologia" value={form.roomType} onChange={(e) => setForm((prev) => ({ ...prev, roomType: e.target.value }))} />
            <select className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink sm:col-span-2" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as typeof form.status }))}>
              <option value="libera">Libera</option>
              <option value="pulita">Pulita / pronta</option>
              <option value="da_pulire">Da pulire</option>
              <option value="occupata">Occupata</option>
              <option value="fuori_servizio">Fuori servizio</option>
              <option value="manutenzione">Bloccata manutenzione</option>
            </select>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white sm:col-span-2"
              onClick={() => {
                const action = editingRoomId ? updateRoom(editingRoomId, form) : createRoom(form);
                action.then(() => {
                  setEditingRoomId(null);
                  setForm({ code: "", floor: 1, capacity: 2, roomType: "Classic", status: "libera" });
                }).catch(console.error);
              }}
            >
              {editingRoomId ? "Salva modifiche" : "Crea camera"}
            </button>
          </div>
        </Card>

        <Card title="Calendario disponibilità" description="Una camera è disponibile se non è occupata, non ha prenotazioni sovrapposte e non è in manutenzione.">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <input type="date" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" value={calendarStart} onChange={(e) => setCalendarStart(e.target.value)} />
            <input type="date" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" value={calendarEnd} onChange={(e) => setCalendarEnd(e.target.value)} />
          </div>
          <DataTable
            columns={[
              { key: "code", header: "Camera", render: (row) => <span className="font-semibold text-rw-ink">{row.code}</span> },
              { key: "roomType", header: "Tipologia", render: (row) => <span className="text-rw-soft">{row.roomType}</span> },
              { key: "status", header: "Stato operativo", render: (row) => <Chip label={row.status.replace("_", " ")} tone={roomTone[row.status]} /> },
              { key: "available", header: "Disponibilità", render: (row) => <Chip label={row.available ? "disponibile" : "occupata / bloccata"} tone={row.available ? "success" : "danger"} /> },
            ]}
            data={calendarRows}
            keyExtractor={(row) => row.id}
          />
        </Card>
      </div>

      <Card title="Stato operativo hotel" description="Schermata rapida tipo mappa tavoli, pensata per reception.">
        <DataTable
          columns={[
            { key: "code", header: "Camera", render: (row) => <span className="font-semibold text-rw-ink">{row.code}</span> },
            { key: "status", header: "Stato", render: (row) => <Chip label={row.status.replace("_", " ")} tone={roomTone[row.status]} /> },
            {
              key: "guest",
              header: "Ospite",
              render: (row) => {
                const reservation = reservations.find((item) => item.roomId === row.id && item.status === "in_casa");
                return <span className="text-rw-ink">{reservation?.guestName || "-"}</span>;
              },
            },
            {
              key: "arrival",
              header: "Arrivo",
              render: (row) => {
                const reservation = reservations.find((item) => item.roomId === row.id && item.status === "in_casa");
                return <span className="text-rw-soft">{reservation?.checkInDate || "-"}</span>;
              },
            },
            {
              key: "departure",
              header: "Partenza",
              render: (row) => {
                const reservation = reservations.find((item) => item.roomId === row.id && item.status === "in_casa");
                return <span className="text-rw-soft">{reservation?.checkOutDate || "-"}</span>;
              },
            },
            {
              key: "cleaning",
              header: "Pulizia",
              render: (row) => {
                const task = housekeeping.find((item) => item.roomId === row.id);
                return <span className="text-rw-soft">{task ? `${task.status}${task.inspected ? " · ispezionata" : ""}` : "pronta"}</span>;
              },
            },
            {
              key: "availability",
              header: "Disponibilità",
              render: (row) => (
                <span className="text-rw-soft">
                  {isRoomAvailableForRange(row, reservations, hotelStays, calendarStart, calendarEnd) ? "Disponibile" : "Non disponibile"}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-rw-line bg-rw-surfaceAlt px-2 py-1 text-xs font-semibold text-rw-ink"
                    onClick={() => {
                      setEditingRoomId(row.id);
                      setForm({ code: row.code, floor: row.floor, capacity: row.capacity, roomType: row.roomType, status: row.status });
                    }}
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400"
                    onClick={() => deleteRoom(row.id).catch(console.error)}
                  >
                    Elimina
                  </button>
                </div>
              ),
            },
          ]}
          data={rooms}
          keyExtractor={(row) => row.id}
          emptyMessage="Nessuna camera configurata"
        />
      </Card>
    </div>
  );
}
