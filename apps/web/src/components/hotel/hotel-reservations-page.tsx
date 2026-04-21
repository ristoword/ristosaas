"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { HotelRoomTypeSelect } from "@/components/hotel/hotel-room-type-select";
import { useHotel } from "@/components/hotel/hotel-context";
import { hotelApi, type HotelReservation, type HotelReservationStatus, type HotelRoom, type RatePlan } from "@/lib/api-client";
import { addDaysIso, nightsBetweenIso, todayIso } from "@/lib/date-utils";

const statusTone = {
  confermata: "info",
  in_casa: "success",
  check_out: "warn",
  cancellata: "danger",
  no_show: "default",
} as const;

function emptyForm(today: string): Omit<HotelReservation, "id"> {
  const out = addDaysIso(today, 2);
  return {
    customerId: "cst_new",
    guestName: "",
    phone: "",
    email: "",
    roomId: "",
    checkInDate: today,
    checkOutDate: out,
    guests: 2,
    status: "confermata" as HotelReservationStatus,
    roomType: "CLASSIC",
    boardType: "bed_breakfast" as const,
    nights: nightsBetweenIso(today, out),
    rate: 0,
    documentCode: "",
  };
}

export function HotelReservationsPage() {
  const { reservations, createReservation, updateReservation, deleteReservation } = useHotel();
  const [availability, setAvailability] = useState<{ availableCount: number; rooms: HotelRoom[]; ratePlans: RatePlan[] } | null>(null);
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const guestNameRef = useRef<HTMLInputElement | null>(null);
  const today = todayIso();
  const [form, setForm] = useState<Omit<HotelReservation, "id">>(() => emptyForm(today));

  const nightsComputed = useMemo(
    () => nightsBetweenIso(form.checkInDate, form.checkOutDate),
    [form.checkInDate, form.checkOutDate],
  );

  const arrivals = reservations.filter((item) => item.checkInDate === today).length;
  const departures = reservations.filter((item) => item.checkOutDate === today).length;
  const boardLabels = {
    room_only: "room only",
    bed_breakfast: "B&B",
    half_board: "mezza pensione",
    full_board: "pensione completa",
  } as const;
  const totalProjectedRevenue = useMemo(
    () => reservations.reduce((sum, reservation) => sum + reservation.rate, 0),
    [reservations],
  );
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);

  const suggestedTotal = useMemo(() => {
    if (!availability) return null;
    const n = nightsComputed;
    const fromRooms = availability.rooms.map((r) => r.defaultNightlyRate).filter((p) => p > 0);
    if (fromRooms.length > 0) {
      const avg = fromRooms.reduce((a, b) => a + b, 0) / fromRooms.length;
      return Math.round(avg * n * 100) / 100;
    }
    const plan = availability.ratePlans[0];
    if (plan) return Math.round(plan.nightlyRate * n * 100) / 100;
    return null;
  }, [availability, nightsComputed]);

  useEffect(() => {
    hotelApi
      .availability({
        roomType: form.roomType,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
      })
      .then(setAvailability)
      .catch(() => setAvailability(null));
  }, [form.roomType, form.checkInDate, form.checkOutDate]);

  return (
    <div className="space-y-6">
      <PageHeader title="Prenotazioni Hotel" subtitle="Arrivi, partenze, assegnazione camera e gestione soggiorni.">
        <Chip label="Arrivi oggi" value={arrivals} tone="info" />
        <Chip label="Partenze oggi" value={departures} tone="warn" />
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white"
          onClick={() => {
            setEditingReservationId(null);
            setForm(emptyForm(todayIso()));
            formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            setTimeout(() => guestNameRef.current?.focus(), 300);
          }}
        >
          <Plus className="h-4 w-4" /> Nuova prenotazione
        </button>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]" ref={formCardRef}>
        <Card title="Nuova prenotazione" description="Stessa tipologia camera del modulo Camere (Classic, Superior, …). Tariffa totale allineata al listino camere quando disponibile.">
          <div className="grid gap-3 sm:grid-cols-2">
            <input ref={guestNameRef} className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink sm:col-span-2" placeholder="Nome ospite" value={form.guestName} onChange={(e) => setForm((prev) => ({ ...prev, guestName: e.target.value }))} />
            <input className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" placeholder="Telefono" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
            <input className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
            <input
              type="date"
              className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
              value={form.checkInDate}
              onChange={(e) => {
                const checkInDate = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  checkInDate,
                  nights: nightsBetweenIso(checkInDate, prev.checkOutDate),
                }));
              }}
            />
            <input
              type="date"
              className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
              value={form.checkOutDate}
              onChange={(e) => {
                const checkOutDate = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  checkOutDate,
                  nights: nightsBetweenIso(prev.checkInDate, checkOutDate),
                }));
              }}
            />
            <input type="number" min="1" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" value={form.guests} onChange={(e) => setForm((prev) => ({ ...prev, guests: parseInt(e.target.value, 10) || 1 }))} />
            <div className="sm:col-span-2">
              <HotelRoomTypeSelect
                id="reservation-room-type"
                value={form.roomType}
                onChange={(roomType) => setForm((prev) => ({ ...prev, roomType }))}
                selectClassName="w-full"
              />
            </div>
            <select className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" value={form.boardType} onChange={(e) => setForm((prev) => ({ ...prev, boardType: e.target.value as typeof form.boardType }))}>
              <option value="room_only">Room only</option>
              <option value="bed_breakfast">B&B</option>
              <option value="half_board">Mezza pensione</option>
              <option value="full_board">Pensione completa</option>
            </select>
            <div>
              <label className="text-xs font-semibold text-rw-muted" htmlFor="res-total-rate">
                Totale soggiorno (€)
              </label>
              <input
                id="res-total-rate"
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
                value={form.rate}
                onChange={(e) => setForm((prev) => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
              />
              <p className="mt-1 text-[11px] text-rw-muted">
                {nightsComputed} notti · suggerito da listino camere:{" "}
                {suggestedTotal != null ? `€ ${suggestedTotal.toFixed(2)}` : "—"}
              </p>
              {suggestedTotal != null && suggestedTotal > 0 ? (
                <button
                  type="button"
                  className="mt-2 rounded-lg border border-rw-accent/40 bg-rw-accent/10 px-3 py-1.5 text-xs font-semibold text-rw-accent"
                  onClick={() => setForm((prev) => ({ ...prev, rate: suggestedTotal }))}
                >
                  Applica tariffa suggerita
                </button>
              ) : null}
            </div>
            <input className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink sm:col-span-2" placeholder="Documento" value={form.documentCode} onChange={(e) => setForm((prev) => ({ ...prev, documentCode: e.target.value }))} />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white sm:col-span-2"
              onClick={() => {
                const action = editingReservationId
                  ? updateReservation(editingReservationId, { ...form, roomId: form.roomId || null, nights: nightsComputed })
                  : createReservation({ ...form, roomId: form.roomId || null, nights: nightsComputed });
                action.then(() => {
                  setEditingReservationId(null);
                  setForm(emptyForm(todayIso()));
                }).catch(console.error);
              }}
            >
              {editingReservationId ? "Salva modifiche" : "Salva prenotazione"}
            </button>
          </div>
        </Card>

        <Card title="Prenota camere — disponibilità e prezzi" description="Il cliente vede le camere libere per tipo e il listino €/notte impostato in Camere (o il piano tariffario).">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <p className="text-sm font-medium text-rw-muted">Disponibili ({form.roomType})</p>
              <p className="mt-2 font-display text-3xl font-semibold text-rw-ink">{availability?.availableCount ?? 0}</p>
              <p className="mt-2 text-sm text-rw-soft">
                {form.checkInDate} → {form.checkOutDate} · {nightsComputed} notti
              </p>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <p className="text-sm font-medium text-rw-muted">Revenue prenotazioni</p>
              <p className="mt-2 font-display text-3xl font-semibold text-rw-ink">€ {totalProjectedRevenue.toFixed(2)}</p>
              <p className="mt-2 text-sm text-rw-soft">Valore complessivo soggiorni registrati.</p>
            </div>
            <div className="sm:col-span-2 rounded-2xl border border-rw-line bg-rw-surface p-4">
              <p className="text-sm font-semibold text-rw-ink">Camere libere e listino (messaggio al cliente)</p>
              {availability && availability.rooms.length > 0 ? (
                <ul className="mt-2 space-y-2 text-sm text-rw-soft">
                  {availability.rooms.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rw-line/60 pb-2 last:border-0 last:pb-0">
                      <span className="font-medium text-rw-ink">Camera {r.code}</span>
                      <span>
                        {r.defaultNightlyRate > 0 ? (
                          <>
                            €{r.defaultNightlyRate.toFixed(2)}/notte · totale indicativo{" "}
                            <span className="font-semibold text-rw-ink">
                              €{(r.defaultNightlyRate * nightsComputed).toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="text-amber-200/90">Listino non impostato — imposta il prezzo in Camere</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-rw-muted">Nessuna camera libera per questa tipologia nelle date scelte.</p>
              )}
            </div>
            {availability?.ratePlans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
                <p className="text-sm font-medium text-rw-muted">{plan.name}</p>
                <p className="mt-2 font-display text-2xl font-semibold text-rw-ink">€ {plan.nightlyRate}</p>
                <p className="mt-2 text-sm text-rw-soft">
                  {boardLabels[plan.boardType]} · {plan.refundable ? "refundable" : "non refundable"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Registro prenotazioni" description="Base operativa reception per prenotazioni, arrivi e assegnazione camera.">
        <DataTable
          columns={[
            { key: "guestName", header: "Cliente", render: (row) => <div><p className="font-semibold text-rw-ink">{row.guestName}</p><p className="text-xs text-rw-muted">{row.phone} · {row.email}</p></div> },
            { key: "dates", header: "Soggiorno", render: (row) => <div><p className="text-rw-ink">{row.checkInDate} → {row.checkOutDate}</p><p className="text-xs text-rw-muted">{row.nights} notti · {row.guests} ospiti</p></div> },
            { key: "roomType", header: "Camera", render: (row) => <div><p className="text-rw-ink">{row.roomType}</p><p className="text-xs text-rw-muted">{row.roomId ? `Assegnata ${row.roomId.replace("hr_", "")}` : "Da assegnare"}</p></div> },
            { key: "rate", header: "Tariffa", render: (row) => <span className="font-semibold text-rw-ink">€ {row.rate}</span> },
            {
              key: "boardType",
              header: "Piano pasti",
              render: (row) => (
                <span className="text-rw-soft">
                  {boardLabels[row.boardType]}
                </span>
              ),
            },
            { key: "documentCode", header: "Documento", render: (row) => <span className="font-mono text-xs text-rw-soft">{row.documentCode}</span> },
            { key: "status", header: "Stato", render: (row) => <Chip label={row.status.replace("_", " ")} tone={statusTone[row.status]} /> },
            {
              key: "actions",
              header: "",
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-rw-line bg-rw-surfaceAlt px-2 py-1 text-xs font-semibold text-rw-ink"
                    onClick={() => {
                      setEditingReservationId(row.id);
                      setForm({
                        customerId: row.customerId,
                        guestName: row.guestName,
                        phone: row.phone,
                        email: row.email,
                        roomId: row.roomId || "",
                        checkInDate: row.checkInDate,
                        checkOutDate: row.checkOutDate,
                        guests: row.guests,
                        status: row.status,
                        roomType: row.roomType,
                        boardType: row.boardType,
                        nights: nightsBetweenIso(row.checkInDate, row.checkOutDate),
                        rate: row.rate,
                        documentCode: row.documentCode,
                      });
                    }}
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400"
                    onClick={() => deleteReservation(row.id).catch(console.error)}
                  >
                    Elimina
                  </button>
                </div>
              ),
            },
          ]}
          data={reservations}
          keyExtractor={(row) => row.id}
          emptyMessage="Nessuna prenotazione registrata"
        />
      </Card>

      <Card title="Flusso operativo" description="Schema minimale per reception e booking office.">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
            <p className="font-semibold text-rw-ink">1. Prenotazione</p>
            <p className="mt-2">Cliente, date, ospiti, tariffa, tipologia camera e documenti.</p>
          </div>
          <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
            <p className="font-semibold text-rw-ink">2. Arrivo / check-in</p>
            <p className="mt-2">Assegni la camera, registri l’ospite e prepari la keycard.</p>
          </div>
          <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
            <p className="font-semibold text-rw-ink">3. Partenza / check-out</p>
            <p className="mt-2">Chiudi il conto, disattivi la card e mandi la camera a pulizia.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
