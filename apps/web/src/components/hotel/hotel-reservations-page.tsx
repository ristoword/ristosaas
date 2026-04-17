"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { useHotel } from "@/components/hotel/hotel-context";
import { hotelApi, type HotelReservation, type HotelReservationStatus, type HotelRoom, type RatePlan } from "@/lib/api-client";
import { todayIso, addDaysIso } from "@/lib/date-utils";

const statusTone = {
  confermata: "info",
  in_casa: "success",
  check_out: "warn",
  cancellata: "danger",
  no_show: "default",
} as const;

export function HotelReservationsPage() {
  const { reservations, createReservation, updateReservation, deleteReservation } = useHotel();
  const [availability, setAvailability] = useState<{ availableCount: number; rooms: HotelRoom[]; ratePlans: RatePlan[] } | null>(null);
  const today = todayIso();
  const [form, setForm] = useState<Omit<HotelReservation, "id">>({
    customerId: "cst_new",
    guestName: "",
    phone: "",
    email: "",
    roomId: "",
    checkInDate: today,
    checkOutDate: addDaysIso(today, 2),
    guests: 2,
    status: "confermata" as HotelReservationStatus,
    roomType: "Classic",
    boardType: "bed_breakfast" as const,
    nights: 2,
    rate: 220,
    documentCode: "",
  });

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
        <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> Nuova prenotazione
        </button>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card title="Nuova prenotazione" description="CRUD base prenotazioni con tipologia soggiorno e piano pasti.">
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink sm:col-span-2" placeholder="Nome ospite" value={form.guestName} onChange={(e) => setForm((prev) => ({ ...prev, guestName: e.target.value }))} />
            <input className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" placeholder="Telefono" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
            <input className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
            <input type="date" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" value={form.checkInDate} onChange={(e) => setForm((prev) => ({ ...prev, checkInDate: e.target.value }))} />
            <input type="date" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" value={form.checkOutDate} onChange={(e) => setForm((prev) => ({ ...prev, checkOutDate: e.target.value }))} />
            <input type="number" min="1" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" value={form.guests} onChange={(e) => setForm((prev) => ({ ...prev, guests: parseInt(e.target.value, 10) || 1 }))} />
            <input className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" placeholder="Tipo camera" value={form.roomType} onChange={(e) => setForm((prev) => ({ ...prev, roomType: e.target.value }))} />
            <select className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" value={form.boardType} onChange={(e) => setForm((prev) => ({ ...prev, boardType: e.target.value as typeof form.boardType }))}>
              <option value="room_only">Room only</option>
              <option value="bed_breakfast">B&B</option>
              <option value="half_board">Mezza pensione</option>
              <option value="full_board">Pensione completa</option>
            </select>
            <input type="number" min="0" step="1" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" value={form.rate} onChange={(e) => setForm((prev) => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))} />
            <input className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink sm:col-span-2" placeholder="Documento" value={form.documentCode} onChange={(e) => setForm((prev) => ({ ...prev, documentCode: e.target.value }))} />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white sm:col-span-2"
              onClick={() => {
                const action = editingReservationId
                  ? updateReservation(editingReservationId, { ...form, roomId: form.roomId || null })
                  : createReservation({ ...form, roomId: form.roomId || null });
                action.then(() => {
                  setEditingReservationId(null);
                  setForm({
                    customerId: "cst_new",
                    guestName: "",
                    phone: "",
                    email: "",
                    roomId: "",
                    checkInDate: "2026-04-15",
                    checkOutDate: "2026-04-17",
                    guests: 2,
                    status: "confermata",
                    roomType: "Classic",
                    boardType: "bed_breakfast",
                    nights: 2,
                    rate: 220,
                    documentCode: "",
                  });
                }).catch(console.error);
              }}
            >
              {editingReservationId ? "Salva modifiche" : "Salva prenotazione"}
            </button>
          </div>
        </Card>

        <Card title="Booking engine per tipologia" description="Disponibilità per tipo camera e tariffa associata.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <p className="text-sm font-medium text-rw-muted">Disponibili per {form.roomType}</p>
              <p className="mt-2 font-display text-3xl font-semibold text-rw-ink">{availability?.availableCount ?? 0}</p>
              <p className="mt-2 text-sm text-rw-soft">{form.checkInDate} → {form.checkOutDate}</p>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <p className="text-sm font-medium text-rw-muted">Revenue prenotazioni</p>
              <p className="mt-2 font-display text-3xl font-semibold text-rw-ink">€ {totalProjectedRevenue.toFixed(2)}</p>
              <p className="mt-2 text-sm text-rw-soft">Valore complessivo soggiorni registrati.</p>
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
                        nights: row.nights,
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
