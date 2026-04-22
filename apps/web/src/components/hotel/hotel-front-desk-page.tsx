"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  CircleDashed,
  CreditCard,
  DoorOpen,
  IdCard,
  Loader2,
  Lock,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { useHotel } from "@/components/hotel/hotel-context";
import type { HotelManualPaymentMethod } from "@/lib/api-client";
import { roomTypesMatch } from "@/modules/hotel/domain/room-type";
import { AiChat, AiToggleButton } from "@/components/ai/ai-chat";

export function HotelFrontDeskPage() {
  const {
    reservations,
    rooms,
    keycards,
    folios,
    charges,
    failedSlices,
    processCheckIn,
    recordFolioPayment,
    finalizeCheckout,
    updateReservation,
    refresh,
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
  const [cityTax, setCityTax] = useState("0");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutFlash, setCheckoutFlash] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<HotelManualPaymentMethod>("carta");
  const [payNote, setPayNote] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [allowResidual, setAllowResidual] = useState(false);
  const [checkoutDoneForSelection, setCheckoutDoneForSelection] = useState(false);

  const EPS = 0.005;

  const arrivals = useMemo(
    () => reservations.filter((item) => item.status === "confermata"),
    [reservations],
  );
  const inHouse = useMemo(
    () => reservations.filter((item) => item.status === "in_casa"),
    [reservations],
  );

  const checkoutOptions = useMemo(() => {
    const sel = selectedCheckout;
    if (!sel) return inHouse;
    if (inHouse.some((r) => r.id === sel)) return inHouse;
    const extra = reservations.find((r) => r.id === sel);
    return extra ? [extra, ...inHouse] : inHouse;
  }, [inHouse, reservations, selectedCheckout]);

  const checkoutReservation = useMemo(
    () => reservations.find((r) => r.id === selectedCheckout) ?? null,
    [reservations, selectedCheckout],
  );

  const folioForCheckout = useMemo(() => {
    if (!checkoutReservation) return null;
    return folios.find((f) => f.reservationId === checkoutReservation.id) ?? null;
  }, [folios, checkoutReservation]);

  const folioCharges = useMemo(() => {
    if (!folioForCheckout) return [];
    return charges
      .filter((c) => c.folioId === folioForCheckout.id)
      .slice()
      .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }, [charges, folioForCheckout]);

  const folioBreakdown = useMemo(() => {
    let hotel = 0;
    let restaurant = 0;
    let manual = 0;
    let city_tax = 0;
    let meal_plan_credit = 0;
    let payment = 0;
    for (const c of folioCharges) {
      if (c.source === "hotel") hotel += c.amount;
      else if (c.source === "restaurant") restaurant += c.amount;
      else if (c.source === "manual") manual += c.amount;
      else if (c.source === "city_tax") city_tax += c.amount;
      else if (c.source === "meal_plan_credit") meal_plan_credit += c.amount;
      else if (c.source === "payment") payment += c.amount;
    }
    const addebiti = hotel + restaurant + manual + city_tax;
    const balanceFromLines = folioCharges.reduce((s, c) => s + c.amount, 0);
    const balance = folioForCheckout?.balance ?? balanceFromLines;
    const paidTowardFolio = -payment;
    return {
      hotel,
      restaurant,
      manual,
      city_tax,
      meal_plan_credit,
      payment,
      addebiti,
      balanceFromLines,
      balance,
      paidTowardFolio,
    };
  }, [folioCharges, folioForCheckout]);

  const cityTaxNum = parseFloat(cityTax) || 0;
  const owedAfterCityTax = folioBreakdown.balance + cityTaxNum;
  const paymentBlockingOk = owedAfterCityTax <= EPS || allowResidual;

  const integrationOk = !failedSlices.includes("folios") && !failedSlices.includes("charges");

  const checkoutStillInHouse = checkoutReservation?.status === "in_casa";

  const checkoutRoom = checkoutReservation
    ? (rooms.find((r) => r.id === checkoutReservation.roomId) ?? null)
    : null;

  const lastPaymentLine = useMemo(
    () =>
      folioCharges
        .filter((c) => c.source === "payment")
        .slice()
        .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())[0],
    [folioCharges],
  );

  const step1Complete = Boolean(checkoutReservation && integrationOk && folioForCheckout);
  const step2DoneVisual =
    checkoutDoneForSelection ||
    Boolean(folioForCheckout && checkoutReservation && paymentBlockingOk && checkoutStillInHouse);
  const step3To5Complete = checkoutDoneForSelection && Boolean(checkoutReservation);

  const canCompleteCheckout =
    Boolean(
      selectedCheckout &&
        folioForCheckout &&
        integrationOk &&
        paymentBlockingOk &&
        checkoutStillInHouse &&
        !checkoutDoneForSelection,
    );

  useEffect(() => {
    setCheckoutDoneForSelection(false);
    setCheckoutError(null);
    setAllowResidual(false);
    setPayAmount("");
    setPayNote("");
  }, [selectedCheckout]);

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
        (!selectedReservation.roomType || roomTypesMatch(r.roomType, selectedReservation.roomType)) &&
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

  async function handleRecordPayment() {
    setCheckoutError(null);
    if (!selectedCheckout || !checkoutReservation) {
      setCheckoutError("Seleziona un ospite in casa.");
      return;
    }
    if (checkoutReservation.status !== "in_casa") {
      setCheckoutError("Il soggiorno non è più in casa: non è possibile registrare pagamenti sul folio da qui.");
      return;
    }
    if (!folioForCheckout) {
      setCheckoutError("Folio non disponibile: impossibile registrare il pagamento.");
      return;
    }
    const amount = parseFloat(payAmount.replace(",", "."));
    if (!amount || amount <= 0 || Number.isNaN(amount)) {
      setCheckoutError("Inserisci un importo pagato valido.");
      return;
    }
    setPayBusy(true);
    try {
      await recordFolioPayment(selectedCheckout, amount, payMethod, payNote.trim() || undefined);
      setPayAmount("");
      setPayNote("");
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Pagamento non registrato.");
    } finally {
      setPayBusy(false);
    }
  }

  async function handleCheckOut() {
    setCheckoutError(null);
    if (!selectedCheckout || !checkoutReservation) {
      setCheckoutError("Seleziona un ospite in casa.");
      return;
    }
    if (!folioForCheckout) {
      setCheckoutError("Folio non disponibile: aggiorna la pagina o verifica i permessi su foli e movimenti.");
      return;
    }
    if (checkoutReservation.status !== "in_casa") {
      setCheckoutError("Questo soggiorno non è più in casa.");
      return;
    }
    if (!integrationOk) {
      setCheckoutError("Dati folio non caricati: impossibile validare il conto.");
      return;
    }
    const owed = folioBreakdown.balance + cityTaxNum;
    if (owed > EPS && !allowResidual) {
      setCheckoutError(
        `Saldo residuo €${owed.toFixed(2)} (conto attuale + tassa di soggiorno). Registra un pagamento o autorizza il checkout con residuo.`,
      );
      return;
    }
    setCheckoutBusy(true);
    try {
      await finalizeCheckout(selectedCheckout, cityTaxNum, payMethod, {
        allowResidual,
        implicitFullPayment: false,
      });
      await refresh();
      setCheckoutDoneForSelection(true);
      setCheckoutFlash(
        "Checkout completato: uscita registrata, keycard disattivate, camera impostata su da_pulire. Il folio risulta saldato o gestito come da regole residue.",
      );
      setTimeout(() => setCheckoutFlash(null), 6000);
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

        <Card title="Check-out" description="Chiusura soggiorno, folio reale e passaggio camera a housekeeping.">
          <div className="space-y-3">
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <p className="text-sm font-semibold text-rw-ink">Soggiorno</p>
              <select
                className="mt-2 w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2.5 text-sm text-rw-ink"
                value={selectedCheckout}
                onChange={(e) => setSelectedCheckout(e.target.value)}
              >
                <option value="">Seleziona ospite in casa…</option>
                {checkoutOptions.map((reservation) => {
                  const room = rooms.find((r) => r.id === reservation.roomId);
                  const suffix = reservation.status !== "in_casa" ? " · (non in casa)" : "";
                  return (
                    <option key={reservation.id} value={reservation.id}>
                      {reservation.guestName} · camera {room?.code ?? "—"}
                      {suffix}
                    </option>
                  );
                })}
              </select>
            </div>

            {(() => {
              const eur = (n: number) =>
                new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
              const stepWrap = (
                step: number,
                title: string,
                status: "done" | "todo" | "blocked",
                body: ReactNode,
              ) => {
                const border =
                  status === "done"
                    ? "border-emerald-500/35 bg-emerald-500/[0.07]"
                    : status === "blocked"
                      ? "border-rw-line bg-rw-surfaceAlt opacity-[0.72]"
                      : "border-rw-line bg-rw-surfaceAlt";
                const label =
                  status === "done" ? "completato" : status === "blocked" ? "bloccato" : "da fare";
                const Icon =
                  status === "done" ? CheckCircle2 : status === "blocked" ? Lock : CircleDashed;
                return (
                  <div key={step} className={`rounded-2xl border p-4 text-sm ${border}`}>
                    <div className="flex items-start gap-3">
                      <Icon
                        className={`mt-0.5 h-5 w-5 shrink-0 ${
                          status === "done"
                            ? "text-emerald-400"
                            : status === "blocked"
                              ? "text-rw-muted"
                              : "text-amber-400"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-rw-ink">
                          Step {step} — {title}{" "}
                          <span className="text-xs font-normal text-rw-muted">({label})</span>
                        </p>
                        <div className="mt-2 space-y-2 text-rw-soft">{body}</div>
                      </div>
                    </div>
                  </div>
                );
              };

              const s1 = !selectedCheckout
                ? ("blocked" as const)
                : !integrationOk
                  ? ("blocked" as const)
                  : step1Complete
                    ? ("done" as const)
                    : ("todo" as const);

              const s2 = !step1Complete || s1 === "blocked" ? ("blocked" as const) : step2DoneVisual ? ("done" as const) : ("todo" as const);

              const paymentReadyForExit = paymentBlockingOk && checkoutStillInHouse;
              const s345 = checkoutBusy
                ? ("blocked" as const)
                : step3To5Complete
                  ? ("done" as const)
                  : paymentReadyForExit
                    ? ("todo" as const)
                    : ("blocked" as const);

              return (
                <>
                  {stepWrap(
                    1,
                    "Conto finale soggiorno",
                    s1,
                    <>
                      {!selectedCheckout ? (
                        <p>Seleziona un soggiorno per caricare il folio.</p>
                      ) : !integrationOk ? (
                        <p>
                          Impossibile leggere foli e addebiti (permessi o errore di rete). Slice non disponibili:{" "}
                          {failedSlices.join(", ") || "folios/charges"}.
                        </p>
                      ) : !folioForCheckout ? (
                        <p>
                          Nessun folio collegato a questa prenotazione nei dati caricati. Verifica che il check-in sia
                          stato eseguito e aggiorna la pagina.
                        </p>
                      ) : (
                        <>
                          <p className="text-rw-ink">
                            Camera {checkoutRoom?.code ?? "—"} · stato camera{" "}
                            <span className="font-medium">{checkoutRoom?.status ?? "—"}</span>
                          </p>
                          {folioCharges.length === 0 ? (
                            <p className="text-rw-ink">Nessun addebito registrato sul folio.</p>
                          ) : (
                            <ul className="divide-y divide-rw-line rounded-xl border border-rw-line bg-rw-surface text-xs text-rw-ink">
                              {folioBreakdown.hotel !== 0 ? (
                                <li className="flex justify-between px-3 py-2">
                                  <span>Soggiorno / camera (hotel)</span>
                                  <span>{eur(folioBreakdown.hotel)}</span>
                                </li>
                              ) : null}
                              {folioBreakdown.restaurant !== 0 ? (
                                <li className="flex justify-between px-3 py-2">
                                  <span>Addebiti ristorante</span>
                                  <span>{eur(folioBreakdown.restaurant)}</span>
                                </li>
                              ) : null}
                              {folioBreakdown.manual !== 0 ? (
                                <li className="flex justify-between px-3 py-2">
                                  <span>Extra / servizi</span>
                                  <span>{eur(folioBreakdown.manual)}</span>
                                </li>
                              ) : null}
                              {folioBreakdown.city_tax !== 0 ? (
                                <li className="flex justify-between px-3 py-2">
                                  <span>Tassa di soggiorno (già a conto)</span>
                                  <span>{eur(folioBreakdown.city_tax)}</span>
                                </li>
                              ) : null}
                              {folioBreakdown.meal_plan_credit !== 0 ? (
                                <li className="flex justify-between px-3 py-2">
                                  <span>Crediti piano pasti</span>
                                  <span>{eur(folioBreakdown.meal_plan_credit)}</span>
                                </li>
                              ) : null}
                              {folioBreakdown.payment !== 0 ? (
                                <li className="flex justify-between px-3 py-2">
                                  <span>Pagamenti registrati</span>
                                  <span>{eur(folioBreakdown.payment)}</span>
                                </li>
                              ) : null}
                            </ul>
                          )}
                          <div className="rounded-xl border border-rw-line bg-rw-surface px-3 py-2 text-xs text-rw-ink">
                            <div className="flex justify-between">
                              <span>Subtotale addebiti (hotel + ristorante + extra + tasse a folio)</span>
                              <span className="font-medium">
                                {eur(
                                  folioBreakdown.hotel +
                                    folioBreakdown.restaurant +
                                    folioBreakdown.manual +
                                    folioBreakdown.city_tax,
                                )}
                              </span>
                            </div>
                            <div className="mt-1 flex justify-between border-t border-rw-line pt-1">
                              <span className="font-semibold">Saldo folio (debito residuo)</span>
                              <span className="font-semibold">{eur(folioBreakdown.balance)}</span>
                            </div>
                            <p className="mt-2 text-rw-muted">
                              Alla chiusura verrà applicata la tassa di soggiorno da campo sotto (se &gt; 0), prima dei
                              controlli finali.
                            </p>
                          </div>
                        </>
                      )}
                    </>,
                  )}

                  {stepWrap(
                    2,
                    "Registrazione pagamento",
                    s2,
                    <>
                      <p>Registra incassi manuali (nessun pagamento online). Il dato viene salvato sul folio.</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="block text-xs text-rw-muted">
                          Importo versato (€)
                          <input
                            className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2 text-sm text-rw-ink"
                            inputMode="decimal"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            disabled={!folioForCheckout || payBusy || !checkoutStillInHouse}
                            placeholder="0,00"
                          />
                        </label>
                        <label className="block text-xs text-rw-muted">
                          Metodo
                          <select
                            className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2 text-sm text-rw-ink"
                            value={payMethod}
                            onChange={(e) => setPayMethod(e.target.value as HotelManualPaymentMethod)}
                            disabled={!folioForCheckout || payBusy || !checkoutStillInHouse}
                          >
                            <option value="contanti">Contanti</option>
                            <option value="carta">Carta</option>
                            <option value="bonifico">Bonifico</option>
                            <option value="altro">Altro</option>
                            <option value="room_charge_settlement">Saldo interno / compensazione</option>
                          </select>
                        </label>
                      </div>
                      <label className="block text-xs text-rw-muted">
                        Nota (opzionale)
                        <input
                          className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2 text-sm text-rw-ink"
                          value={payNote}
                          onChange={(e) => setPayNote(e.target.value)}
                          disabled={!folioForCheckout || payBusy || !checkoutStillInHouse}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={!folioForCheckout || payBusy || !checkoutStillInHouse}
                        onClick={handleRecordPayment}
                        className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surface px-3 py-2 text-sm font-semibold text-rw-ink hover:bg-rw-surfaceAlt disabled:opacity-40"
                      >
                        {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        Registra pagamento sul folio
                      </button>
                      {folioForCheckout ? (
                        <p className="text-rw-ink">
                          Stato incasso:{" "}
                          {owedAfterCityTax <= EPS ? (
                            <span className="font-semibold text-emerald-400">Coperto (saldo con tassa inclusa)</span>
                          ) : (
                            <span className="font-semibold text-amber-300">
                              Residuo €{owedAfterCityTax.toFixed(2)} (conto + tassa di soggiorno da applicare)
                            </span>
                          )}
                        </p>
                      ) : null}
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-rw-ink">
                        <input
                          type="checkbox"
                          checked={allowResidual}
                          onChange={(e) => setAllowResidual(e.target.checked)}
                          disabled={!folioForCheckout || !checkoutStillInHouse}
                        />
                        Autorizza checkout con saldo residuo sul folio (solo se policy interna lo consente)
                      </label>
                    </>,
                  )}

                  {stepWrap(
                    3,
                    "Keycard e uscita",
                    s345,
                    <p>
                      Al completamento del checkout le keycard attive della prenotazione vengono annullate e viene
                      registrata l&apos;ora di uscita sul soggiorno (<code className="text-rw-muted">actualCheckOutAt</code>
                      ).
                    </p>,
                  )}

                  {stepWrap(
                    4,
                    "Camera a housekeeping",
                    s345,
                    <p>
                      La camera passa allo stato <span className="font-semibold text-rw-ink">da_pulire</span> e viene
                      creata un&apos;attività housekeeping.
                    </p>,
                  )}

                  {stepWrap(
                    5,
                    "Disponibilità dopo pulizie",
                    s345,
                    <p>
                      La camera <strong>non</strong> torna libera subito: resta in{" "}
                      <span className="font-semibold text-rw-ink">da_pulire</span> finché il flusso housekeeping non la
                      riporta a <span className="font-semibold text-rw-ink">pulita</span> /{" "}
                      <span className="font-semibold text-rw-ink">libera</span> secondo le regole operative del gestionale.
                    </p>,
                  )}
                </>
              );
            })()}

            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-rw-ink">
                <Sparkles className="h-4 w-4 text-rw-accent" />
                Esegui checkout reale
              </p>
              <p className="mt-1 text-xs text-rw-soft">
                Il server verifica folio, saldo (o residuo autorizzato), poi registra uscita, keycard e stato camera.
              </p>
              <div className="mt-3 space-y-2 rounded-xl border border-rw-line bg-rw-surface px-3 py-2 text-xs text-rw-ink">
                <div className="flex justify-between gap-2">
                  <span>Saldo folio (oggi)</span>
                  <span className="font-medium">
                    {folioForCheckout
                      ? new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
                          folioBreakdown.balance,
                        )
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Tassa di soggiorno da applicare al checkout</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="w-24 rounded-lg border border-rw-line bg-rw-surfaceAlt px-2 py-1 text-right text-rw-ink"
                    value={cityTax}
                    onChange={(e) => setCityTax(e.target.value)}
                  />
                </div>
                <div className="flex justify-between gap-2 border-t border-rw-line pt-1 font-semibold">
                  <span>Totale da saldare (conto + tassa campo)</span>
                  <span>
                    {folioForCheckout
                      ? new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(owedAfterCityTax)
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Importo già versato (somma pagamenti su folio)</span>
                  <span className="font-medium">
                    {folioForCheckout
                      ? new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
                          folioBreakdown.paidTowardFolio,
                        )
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Residuo stimato dopo tassa campo</span>
                  <span className="font-medium">
                    {folioForCheckout
                      ? new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
                          Math.max(0, owedAfterCityTax),
                        )
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-rw-muted">
                  <span>Metodo (ultimo / usato in chiusura)</span>
                  <span className="max-w-[60%] truncate text-right text-rw-ink">
                    {lastPaymentLine?.description ?? payMethod}
                  </span>
                </div>
              </div>
              {checkoutError ? (
                <p
                  role="alert"
                  className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
                >
                  {checkoutError}
                </p>
              ) : null}
              {checkoutFlash ? (
                <p
                  role="status"
                  className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
                >
                  <CheckCircle2 className="mr-2 inline h-4 w-4" />
                  {checkoutFlash}
                </p>
              ) : null}
              <button
                type="button"
                disabled={checkoutBusy || !canCompleteCheckout}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rw-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
                onClick={handleCheckOut}
              >
                {checkoutBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <DoorOpen className="h-4 w-4" />
                )}
                Completa checkout (uscita, keycard, camera da_pulire)
              </button>
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
