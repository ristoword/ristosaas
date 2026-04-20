"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, DoorOpen, IdCard, Loader2, UserRoundCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { useHotel } from "@/components/hotel/hotel-context";
import { AiChat, AiToggleButton } from "@/components/ai/ai-chat";

export function HotelFrontDeskPage() {
  const {
    reservations,
    rooms,
    keycards,
    failedSlices,
    processCheckIn,
    finalizeCheckout,
    updateReservation,
  } = useHotel();
  const [aiOpen, setAiOpen] = useState(false);

  // Check-in state
  const [selectedCheckin, setSelectedCheckin] = useState("");
  const [documentCode, setDocumentCode] = useState("");
  const [assignedRoomId, setAssignedRoomId] = useState("");
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [checkinFlash, setCheckinFlash] = useState<string | null>(null);

  // Check-out state
  const [selectedCheckout, setSelectedCheckout] = useState("");
  const [cityTax, setCityTax] = useState("6");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "room_charge_settlement">("card");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutFlash, setCheckoutFlash] = useState<string | null>(null);

  const arrivals = useMemo(
    () => reservations.filter((item) => item.status === "confermata"),
    [reservations],
  );
  const inHouse = useMemo(
    () => reservations.filter((item) => item.status === "in_casa"),
    [reservations],
  );

  // Pre-carico dati quando cambia la selezione della prenotazione in arrivo.
  useEffect(() => {
    const reservation = arrivals.find((r) => r.id === selectedCheckin) ?? null;
    setDocumentCode(reservation?.documentCode ?? "");
    setAssignedRoomId(reservation?.roomId ?? "");
    setCheckinError(null);
  }, [selectedCheckin, arrivals]);

  const selectedReservation = arrivals.find((r) => r.id === selectedCheckin) ?? null;

  // Camere realmente disponibili per il check-in: libere o pulite,
  // e compatibili col roomType richiesto dalla prenotazione.
  const availableRoomsForCheckin = useMemo(() => {
    if (!selectedReservation) return rooms.filter((r) => r.status === "libera" || r.status === "pulita");
    const matching = rooms.filter(
      (r) =>
        (r.roomType === selectedReservation.roomType || !selectedReservation.roomType) &&
        (r.status === "libera" || r.status === "pulita"),
    );
    return matching.length > 0
      ? matching
      : rooms.filter((r) => r.status === "libera" || r.status === "pulita");
  }, [rooms, selectedReservation]);

  async function handleCheckIn() {
    setCheckinError(null);
    if (!selectedReservation) {
      setCheckinError("Seleziona una prenotazione in arrivo.");
      return;
    }
    if (!documentCode.trim()) {
      setCheckinError("Registra un documento dell'ospite prima del check-in.");
      return;
    }
    if (!assignedRoomId) {
      setCheckinError("Assegna una camera disponibile.");
      return;
    }
    setCheckinBusy(true);
    try {
      if (documentCode.trim() !== (selectedReservation.documentCode ?? "")) {
        await updateReservation(selectedReservation.id, { documentCode: documentCode.trim() });
      }
      await processCheckIn(selectedReservation.id, assignedRoomId);
      setCheckinFlash(`Check-in completato per ${selectedReservation.guestName}.`);
      setSelectedCheckin("");
      setDocumentCode("");
      setAssignedRoomId("");
      setTimeout(() => setCheckinFlash(null), 3000);
    } catch (error) {
      setCheckinError(error instanceof Error ? error.message : "Check-in non riuscito.");
    } finally {
      setCheckinBusy(false);
    }
  }

  async function handleCheckOut() {
    setCheckoutError(null);
    if (!selectedCheckout) {
      setCheckoutError("Seleziona un ospite in casa.");
      return;
    }
    setCheckoutBusy(true);
    try {
      await finalizeCheckout(selectedCheckout, parseFloat(cityTax) || 0, paymentMethod);
      setCheckoutFlash("Checkout chiuso, folio saldato.");
      setSelectedCheckout("");
      setTimeout(() => setCheckoutFlash(null), 3000);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Check-out non riuscito.");
    } finally {
      setCheckoutBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check-in / Check-out"
        subtitle="Flusso operativo principale reception: arrivo, permanenza, partenza."
      >
        <Chip label="Da check-in" value={arrivals.length} tone="info" />
        <Chip label="In casa" value={inHouse.length} tone="success" />
        <AiToggleButton onClick={() => setAiOpen(true)} label="AI Check-in/out" />
      </PageHeader>

      {failedSlices.length > 0 ? (
        <p
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
        >
          Alcuni dati hotel non sono disponibili con il tuo ruolo: {failedSlices.join(", ")}. Chiedi
          al super admin se ti servono.
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card
          title="Check-in"
          description="Seleziona la prenotazione in arrivo, registra il documento e assegna la camera."
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line">
                  <DoorOpen className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-rw-ink">1. Apri prenotazione</p>
                  <p className="text-sm text-rw-soft">
                    {arrivals.length > 0
                      ? `${arrivals.length} arrivo${arrivals.length > 1 ? "i" : ""} in attesa di check-in.`
                      : "Nessun arrivo in attesa oggi."}
                  </p>
                </div>
              </div>
              <select
                className="mt-3 w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2.5 text-sm text-rw-ink"
                value={selectedCheckin}
                onChange={(e) => setSelectedCheckin(e.target.value)}
              >
                <option value="">Seleziona una prenotazione confermata…</option>
                {arrivals.map((reservation) => (
                  <option key={reservation.id} value={reservation.id}>
                    {reservation.guestName} · {reservation.nights}n · {reservation.roomType} ·{" "}
                    {reservation.checkInDate}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line">
                  <IdCard className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-rw-ink">2. Controlla documento</p>
                  <p className="text-sm text-rw-soft">
                    Registra il documento dell&apos;ospite (es. carta d&apos;identità, passaporto).
                  </p>
                </div>
              </div>
              <input
                className="mt-3 w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2.5 text-sm text-rw-ink"
                placeholder="Numero documento"
                value={documentCode}
                onChange={(e) => setDocumentCode(e.target.value)}
                disabled={!selectedReservation}
              />
            </div>

            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line">
                  <UserRoundCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-rw-ink">3. Assegna camera</p>
                  <p className="text-sm text-rw-soft">
                    {availableRoomsForCheckin.length} camere disponibili coerenti con la prenotazione.
                  </p>
                </div>
              </div>
              <select
                className="mt-3 w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2.5 text-sm text-rw-ink"
                value={assignedRoomId}
                onChange={(e) => setAssignedRoomId(e.target.value)}
                disabled={!selectedReservation}
              >
                <option value="">Seleziona camera…</option>
                {availableRoomsForCheckin.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.code} · {room.roomType} · piano {room.floor} · {room.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-rw-ink">4. Emetti keycard</p>
                  <p className="text-sm text-rw-soft">
                    La keycard viene emessa automaticamente al completamento del check-in.
                  </p>
                </div>
              </div>
            </div>

            {checkinError ? (
              <p
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              >
                {checkinError}
              </p>
            ) : null}
            {checkinFlash ? (
              <p
                role="status"
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
              >
                <CheckCircle2 className="mr-2 inline h-4 w-4" />
                {checkinFlash}
              </p>
            ) : null}

            <button
              type="button"
              disabled={checkinBusy || !selectedReservation || !documentCode.trim() || !assignedRoomId}
              onClick={handleCheckIn}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rw-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-rw-accent/90 disabled:opacity-40"
            >
              {checkinBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Conferma check-in
            </button>
          </div>
        </Card>

        <Card title="Check-out" description="Chiusura soggiorno e passaggio camera a housekeeping.">
          <div className="space-y-3">
            {[
              "Chiudi il conto finale del soggiorno.",
              "Disattivi la keycard e registri l'uscita.",
              "La prenotazione passa a check-out completato.",
              "La camera passa a da pulire.",
              "Dopo housekeeping torna disponibile.",
            ].map((step, index) => (
              <div
                key={step}
                className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft"
              >
                <p className="font-semibold text-rw-ink">Step {index + 1}</p>
                <p className="mt-1">{step}</p>
              </div>
            ))}
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <p className="text-sm font-semibold text-rw-ink">Esegui checkout reale</p>
              <div className="mt-3 space-y-3">
                <select
                  className="w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2.5 text-sm text-rw-ink"
                  value={selectedCheckout}
                  onChange={(e) => setSelectedCheckout(e.target.value)}
                >
                  <option value="">Seleziona ospite in casa…</option>
                  {inHouse.map((reservation) => {
                    const room = rooms.find((r) => r.id === reservation.roomId);
                    return (
                      <option key={reservation.id} value={reservation.id}>
                        {reservation.guestName} · camera {room?.code ?? "—"}
                      </option>
                    );
                  })}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.50"
                  className="w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2.5 text-sm text-rw-ink"
                  value={cityTax}
                  onChange={(e) => setCityTax(e.target.value)}
                  placeholder="Tassa di soggiorno"
                />
                <select
                  className="w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2.5 text-sm text-rw-ink"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                >
                  <option value="card">Carta</option>
                  <option value="cash">Contanti</option>
                  <option value="room_charge_settlement">Addebito / saldo interno</option>
                </select>
                {checkoutError ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
                  >
                    {checkoutError}
                  </p>
                ) : null}
                {checkoutFlash ? (
                  <p
                    role="status"
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
                  >
                    <CheckCircle2 className="mr-2 inline h-4 w-4" />
                    {checkoutFlash}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={checkoutBusy || !selectedCheckout}
                  className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                  onClick={handleCheckOut}
                >
                  {checkoutBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  Chiudi checkout e folio
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {keycards.length > 0 ? (
        <Card
          title="Keycard attive"
          description="Tessere elettroniche emesse e non ancora revocate."
        >
          <ul className="divide-y divide-rw-line text-sm">
            {keycards
              .filter((card) => card.status === "attiva")
              .slice(0, 8)
              .map((card) => {
                const room = rooms.find((r) => r.id === card.roomId);
                const reservation = reservations.find((r) => r.id === card.reservationId);
                return (
                  <li key={card.id} className="flex items-center justify-between py-2 text-rw-soft">
                    <span>
                      <span className="font-semibold text-rw-ink">Camera {room?.code ?? "—"}</span>
                      {reservation ? ` · ${reservation.guestName}` : ""}
                    </span>
                    <span className="text-xs text-rw-muted">
                      fino al {new Date(card.validUntil).toLocaleDateString("it-IT")}
                    </span>
                  </li>
                );
              })}
            {keycards.filter((card) => card.status === "attiva").length === 0 ? (
              <li className="py-2 text-rw-muted">Nessuna keycard attiva al momento.</li>
            ) : null}
          </ul>
        </Card>
      ) : null}

      <AiChat
        context="hotel"
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        title="AI Hotel Check-in/out e Pagamenti"
      />
    </div>
  );
}
