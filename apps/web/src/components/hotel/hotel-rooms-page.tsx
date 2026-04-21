"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { HotelRoomTypeSelect } from "@/components/hotel/hotel-room-type-select";
import { useHotel } from "@/components/hotel/hotel-context";
import type { HotelRoom } from "@/lib/api-client";
import { isRoomAvailableForRange } from "@/modules/hotel/domain/availability";
import { todayIso, addDaysIso } from "@/lib/date-utils";

const roomTone = {
  libera: "success",
  occupata: "danger",
  da_pulire: "warn",
  pulita: "info",
  fuori_servizio: "default",
  manutenzione: "default",
} as const;

export function HotelRoomsPage() {
  const { rooms, reservations, housekeeping, createRoom, updateRoom, deleteRoom, failedSlices } = useHotel();
  const [calendarStart, setCalendarStart] = useState(() => todayIso());
  const [calendarEnd, setCalendarEnd] = useState(() => addDaysIso(todayIso(), 1));
  const [form, setForm] = useState<Omit<HotelRoom, "id">>({
    code: "",
    floor: 1,
    capacity: 2,
    roomType: "CLASSIC",
    status: "libera",
    defaultNightlyRate: 0,
  });
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  const stays = useMemo(
    () =>
      [] as Array<{ id: string; reservationId: string; roomId: string; actualCheckInAt: string | null; actualCheckOutAt: string | null }>,
    [],
  );

  const availableToday = rooms.filter((room) =>
    isRoomAvailableForRange(room, reservations, stays, calendarStart, calendarEnd),
  ).length;

  const calendarRows = useMemo(
    () =>
      rooms.map((room) => ({
        ...room,
        available: isRoomAvailableForRange(room, reservations, stays, calendarStart, calendarEnd),
      })),
    [rooms, reservations, stays, calendarStart, calendarEnd],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Camere" subtitle="Disponibilità reale, stato operativo e housekeeping.">
        <Chip label="Disponibili oggi" value={availableToday} tone="success" />
        <Chip label="Totale camere" value={rooms.length} tone="accent" />
      </PageHeader>

      {failedSlices.length > 0 ? (
        <p
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
        >
          Alcune informazioni hotel non sono disponibili con il tuo ruolo: {failedSlices.join(", ")}.
          La pagina mostra i dati che hai diritto di vedere. Chiedi al super admin di abilitare il ruolo se serve.
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card title="Nuova camera" description="Tipologia come in Prenotazioni hotel; imposta il listino €/notte usato in booking e messaggio al cliente.">
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" placeholder="Numero camera" value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
            <input type="number" min="0" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" placeholder="Piano" value={form.floor} onChange={(e) => setForm((prev) => ({ ...prev, floor: parseInt(e.target.value, 10) || 0 }))} />
            <input type="number" min="1" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" placeholder="Capienza" value={form.capacity} onChange={(e) => setForm((prev) => ({ ...prev, capacity: parseInt(e.target.value, 10) || 1 }))} />
            <div>
              <label className="text-xs font-semibold text-rw-muted" htmlFor="hotel-room-nightly">
                Prezzo listino (€ / notte)
              </label>
              <input
                id="hotel-room-nightly"
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
                placeholder="0.00"
                value={form.defaultNightlyRate || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, defaultNightlyRate: parseFloat(e.target.value) || 0 }))
                }
              />
              <p className="mt-1 text-[11px] text-rw-muted">Usato in Prenotazioni hotel per mostrare la tariffa al cliente.</p>
            </div>
            <div className="sm:col-span-2">
              <HotelRoomTypeSelect
                id="hotel-room-type"
                value={form.roomType}
                onChange={(roomType) => setForm((prev) => ({ ...prev, roomType }))}
                selectClassName="w-full"
              />
            </div>
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
                  setForm({ code: "", floor: 1, capacity: 2, roomType: "CLASSIC", status: "libera", defaultNightlyRate: 0 });
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
              {
                key: "defaultNightlyRate",
                header: "€ / notte",
                render: (row) => (
                  <span className="font-medium text-rw-ink">
                    {row.defaultNightlyRate > 0 ? `€ ${row.defaultNightlyRate.toFixed(2)}` : "—"}
                  </span>
                ),
              },
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
            {
              key: "defaultNightlyRate",
              header: "Listino",
              render: (row) => (
                <span className="text-rw-soft">{row.defaultNightlyRate > 0 ? `€${row.defaultNightlyRate.toFixed(2)}/n` : "—"}</span>
              ),
            },
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
                  {isRoomAvailableForRange(row, reservations, stays, calendarStart, calendarEnd) ? "Disponibile" : "Non disponibile"}
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
                      setForm({
                        code: row.code,
                        floor: row.floor,
                        capacity: row.capacity,
                        roomType: row.roomType,
                        status: row.status,
                        defaultNightlyRate: row.defaultNightlyRate ?? 0,
                        ratePlanCode: row.ratePlanCode,
                      });
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
