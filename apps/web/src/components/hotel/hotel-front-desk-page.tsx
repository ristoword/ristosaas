"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
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
import type { AccessCredentialType, HotelManualPaymentMethod, MobileAccessDeliveryChannel } from "@/lib/api-client";
import { roomTypesMatch } from "@/modules/hotel/domain/room-type";
import { AiChat, AiToggleButton } from "@/components/ai/ai-chat";
import { translateApiError } from "@/core/i18n/translate-api-error";
import { useI18n } from "@/core/i18n/provider";

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
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const reservationFromUrl = searchParams.get("reservation");
  const [aiOpen, setAiOpen] = useState(false);

  // Check-in state
  const [selectedCheckin, setSelectedCheckin] = useState("");
  const [documentCode, setDocumentCode] = useState("");
  const [assignedRoomId, setAssignedRoomId] = useState("");
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [checkinFlash, setCheckinFlash] = useState<string | null>(null);
  const [accessMethods, setAccessMethods] = useState<AccessCredentialType[]>(["RFID_CARD"]);
  const [sendVia, setSendVia] = useState<MobileAccessDeliveryChannel[]>([]);

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

  const fmtLocale = locale === "nl" ? "nl-NL" : locale === "en" ? "en-GB" : "it-IT";

  const arrivals = useMemo(
    () => reservations.filter((item) => item.status === "confermata"),
    [reservations],
  );

  useEffect(() => {
    if (!reservationFromUrl) return;
    const match = reservations.find((r) => r.id === reservationFromUrl);
    if (match && match.status === "confermata") {
      setSelectedCheckin(match.id);
      setDocumentCode(match.documentCode ?? "");
    }
  }, [reservationFromUrl, reservations]);
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

  useEffect(() => {
    const reservation = arrivals.find((r) => r.id === selectedCheckin) ?? null;
    setDocumentCode(reservation?.documentCode ?? "");
    setAssignedRoomId(reservation?.roomId ?? "");
    setCheckinError(null);
    setAccessMethods(["RFID_CARD"]);
    setSendVia([]);
  }, [selectedCheckin, arrivals]);

  const selectedReservation = arrivals.find((r) => r.id === selectedCheckin) ?? null;

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

  const digitalAccessSelected = accessMethods.some((m) =>
    ["MOBILE_KEY", "APPLE_WALLET", "GOOGLE_WALLET", "NFC", "BLE", "QR_CODE"].includes(m),
  );

  function toggleAccessMethod(method: AccessCredentialType) {
    setAccessMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method],
    );
  }

  function toggleSendChannel(channel: MobileAccessDeliveryChannel) {
    setSendVia((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    );
  }

  async function handleCheckIn() {
    setCheckinError(null);
    if (!selectedReservation) {
      setCheckinError(t("hotel.checkin.err.no_reservation"));
      return;
    }
    if (!documentCode.trim()) {
      setCheckinError(t("hotel.checkin.err.no_document"));
      return;
    }
    if (!assignedRoomId) {
      setCheckinError(t("hotel.checkin.err.no_room"));
      return;
    }
    if (accessMethods.length === 0) {
      setCheckinError(t("hotel.checkin.access.err.none"));
      return;
    }
    setCheckinBusy(true);
    try {
      if (documentCode.trim() !== (selectedReservation.documentCode ?? "")) {
        await updateReservation(selectedReservation.id, { documentCode: documentCode.trim() });
      }
      await processCheckIn(selectedReservation.id, assignedRoomId, {
        accessMethods,
        sendVia: digitalAccessSelected && sendVia.length > 0 ? sendVia : undefined,
      });
      setCheckinFlash(`${t("hotel.checkin.success")} ${selectedReservation.guestName}.`);
      setSelectedCheckin("");
      setDocumentCode("");
      setAssignedRoomId("");
      setTimeout(() => setCheckinFlash(null), 3000);
    } catch (error) {
      setCheckinError(
        translateApiError(error instanceof Error ? error.message : t("hotel.checkin.err.failed"), t),
      );
    } finally {
      setCheckinBusy(false);
    }
  }

  async function handleRecordPayment() {
    setCheckoutError(null);
    if (!selectedCheckout || !checkoutReservation) {
      setCheckoutError(t("hotel.checkout.err.no_guest"));
      return;
    }
    if (checkoutReservation.status !== "in_casa") {
      setCheckoutError(t("hotel.checkout.err.not_in_house_pay"));
      return;
    }
    if (!folioForCheckout) {
      setCheckoutError(t("hotel.checkout.err.no_folio_pay"));
      return;
    }
    const amount = parseFloat(payAmount.replace(",", "."));
    if (!amount || amount <= 0 || Number.isNaN(amount)) {
      setCheckoutError(t("hotel.checkout.err.invalid_amount"));
      return;
    }
    setPayBusy(true);
    try {
      await recordFolioPayment(selectedCheckout, amount, payMethod, payNote.trim() || undefined);
      setPayAmount("");
      setPayNote("");
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : t("hotel.checkout.err.pay_failed"));
    } finally {
      setPayBusy(false);
    }
  }

  async function handleCheckOut() {
    setCheckoutError(null);
    if (!selectedCheckout || !checkoutReservation) {
      setCheckoutError(t("hotel.checkout.err.no_guest"));
      return;
    }
    if (!folioForCheckout) {
      setCheckoutError(t("hotel.checkout.err.no_folio"));
      return;
    }
    if (checkoutReservation.status !== "in_casa") {
      setCheckoutError(t("hotel.checkout.err.not_in_house"));
      return;
    }
    if (!integrationOk) {
      setCheckoutError(t("hotel.checkout.err.folio_missing"));
      return;
    }
    const owed = folioBreakdown.balance + cityTaxNum;
    if (owed > EPS && !allowResidual) {
      setCheckoutError(
        `${t("hotel.checkout.err.residual_prefix")} €${owed.toFixed(2)} ${t("hotel.checkout.err.residual_suffix")}`,
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
      setCheckoutFlash(t("hotel.checkout.success"));
      setTimeout(() => setCheckoutFlash(null), 6000);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : t("hotel.checkout.err.failed"));
    } finally {
      setCheckoutBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("hotel.checkin.title")}
        subtitle={t("hotel.checkin.subtitle")}
      >
        <Chip label={t("hotel.checkin.chip.pending")} value={arrivals.length} tone="info" />
        <Chip label={t("hotel.checkin.chip.inhouse")} value={inHouse.length} tone="success" />
        <AiToggleButton onClick={() => setAiOpen(true)} label={t("hotel.checkin.ai_label")} />
      </PageHeader>

      {failedSlices.length > 0 ? (
        <p
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
        >
          {t("hotel.checkin.alert")} {failedSlices.join(", ")}{t("hotel.checkin.alert2")}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card
          title={t("hotel.checkin.card.title")}
          description={t("hotel.checkin.card.desc")}
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line">
                  <DoorOpen className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-rw-ink">{t("hotel.checkin.step1.title")}</p>
                  <p className="text-sm text-rw-soft">
                    {arrivals.length > 0
                      ? `${arrivals.length} ${t(arrivals.length > 1 ? "hotel.checkin.arrivals.plural" : "hotel.checkin.arrival")} ${t("hotel.checkin.step1.waiting")}`
                      : t("hotel.checkin.step1.no_arrivals")}
                  </p>
                </div>
              </div>
              <select
                className="mt-3 w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2.5 text-sm text-rw-ink"
                value={selectedCheckin}
                onChange={(e) => setSelectedCheckin(e.target.value)}
              >
                <option value="">{t("hotel.checkin.step1.select")}</option>
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
                  <p className="font-semibold text-rw-ink">{t("hotel.checkin.step2.title")}</p>
                  <p className="text-sm text-rw-soft">{t("hotel.checkin.step2.desc")}</p>
                </div>
              </div>
              <input
                className="mt-3 w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2.5 text-sm text-rw-ink"
                placeholder={t("hotel.checkin.step2.placeholder")}
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
                  <p className="font-semibold text-rw-ink">{t("hotel.checkin.step3.title")}</p>
                  <p className="text-sm text-rw-soft">
                    {availableRoomsForCheckin.length} {t("hotel.checkin.step3.rooms")}
                  </p>
                </div>
              </div>
              <select
                className="mt-3 w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2.5 text-sm text-rw-ink"
                value={assignedRoomId}
                onChange={(e) => setAssignedRoomId(e.target.value)}
                disabled={!selectedReservation}
              >
                <option value="">{t("hotel.checkin.step3.select")}</option>
                {availableRoomsForCheckin.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.code} · {room.roomType} · {t("hotel.checkin.step3.floor")} {room.floor} · {room.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line">
                  <Lock className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-rw-ink">{t("hotel.checkin.access.title")}</p>
                  <p className="text-sm text-rw-soft">{t("hotel.checkin.access.desc")}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["PHYSICAL_KEY", "hotel.checkin.access.physical"],
                    ["RFID_CARD", "hotel.checkin.access.rfid"],
                    ["MOBILE_KEY", "hotel.checkin.access.mobile"],
                    ["APPLE_WALLET", "hotel.checkin.access.apple"],
                    ["GOOGLE_WALLET", "hotel.checkin.access.google"],
                  ] as const
                ).map(([method, labelKey]) => (
                  <label
                    key={method}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-rw-line bg-rw-surface px-3 py-2 text-sm text-rw-ink"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-rw-line"
                      checked={accessMethods.includes(method)}
                      onChange={() => toggleAccessMethod(method)}
                      disabled={!selectedReservation}
                    />
                    {t(labelKey)}
                  </label>
                ))}
              </div>
              {digitalAccessSelected ? (
                <div className="mt-3 border-t border-rw-line/50 pt-3">
                  <p className="text-xs font-semibold text-rw-soft">{t("hotel.checkin.access.sendVia")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["email", "sms", "whatsapp", "qr", "link"] as const).map((ch) => (
                      <label
                        key={ch}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-rw-line px-2.5 py-1 text-xs text-rw-ink"
                      >
                        <input
                          type="checkbox"
                          checked={sendVia.includes(ch)}
                          onChange={() => toggleSendChannel(ch)}
                          disabled={!selectedReservation}
                        />
                        {t(`hotel.checkin.access.send.${ch}`)}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-rw-ink">{t("hotel.checkin.step4.title")}</p>
                  <p className="text-sm text-rw-soft">{t("hotel.checkin.step4.desc")}</p>
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
              {t("hotel.checkin.confirm")}
            </button>
          </div>
        </Card>

        <Card title={t("hotel.checkout.card.title")} description={t("hotel.checkout.card.desc")}>
          <div className="space-y-3">
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <p className="text-sm font-semibold text-rw-ink">{t("hotel.checkout.stay_label")}</p>
              <select
                className="mt-2 w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2.5 text-sm text-rw-ink"
                value={selectedCheckout}
                onChange={(e) => setSelectedCheckout(e.target.value)}
              >
                <option value="">{t("hotel.checkout.select")}</option>
                {checkoutOptions.map((reservation) => {
                  const room = rooms.find((r) => r.id === reservation.roomId);
                  const suffix = reservation.status !== "in_casa" ? t("hotel.checkout.not_in_house") : "";
                  return (
                    <option key={reservation.id} value={reservation.id}>
                      {reservation.guestName} · {t("hotel.checkout.room")} {room?.code ?? "—"}
                      {suffix}
                    </option>
                  );
                })}
              </select>
            </div>

            {(() => {
              const eur = (n: number) =>
                new Intl.NumberFormat(fmtLocale, { style: "currency", currency: "EUR" }).format(n);
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
                  status === "done" ? t("hotel.checkout.step.done") : status === "blocked" ? t("hotel.checkout.step.blocked") : t("hotel.checkout.step.todo");
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
                    t("hotel.checkout.s1.title"),
                    s1,
                    <>
                      {!selectedCheckout ? (
                        <p>{t("hotel.checkout.s1.select")}</p>
                      ) : !integrationOk ? (
                        <p>
                          {t("hotel.checkout.s1.folio_err")} {failedSlices.join(", ") || "folios/charges"}.
                        </p>
                      ) : !folioForCheckout ? (
                        <p>{t("hotel.checkout.s1.no_folio")}</p>
                      ) : (
                        <>
                          <p className="text-rw-ink">
                            {t("hotel.room.col.room")} {checkoutRoom?.code ?? "—"} {t("hotel.checkout.s1.room_status")}{" "}
                            <span className="font-medium">{checkoutRoom?.status ?? "—"}</span>
                          </p>
                          {folioCharges.length === 0 ? (
                            <p className="text-rw-ink">{t("hotel.checkout.s1.no_charges")}</p>
                          ) : (
                            <ul className="divide-y divide-rw-line rounded-xl border border-rw-line bg-rw-surface text-xs text-rw-ink">
                              {folioBreakdown.hotel !== 0 ? (
                                <li className="flex justify-between px-3 py-2">
                                  <span>{t("hotel.checkout.line.hotel")}</span>
                                  <span>{eur(folioBreakdown.hotel)}</span>
                                </li>
                              ) : null}
                              {folioBreakdown.restaurant !== 0 ? (
                                <li className="flex justify-between px-3 py-2">
                                  <span>{t("hotel.checkout.line.restaurant")}</span>
                                  <span>{eur(folioBreakdown.restaurant)}</span>
                                </li>
                              ) : null}
                              {folioBreakdown.manual !== 0 ? (
                                <li className="flex justify-between px-3 py-2">
                                  <span>{t("hotel.checkout.line.extras")}</span>
                                  <span>{eur(folioBreakdown.manual)}</span>
                                </li>
                              ) : null}
                              {folioBreakdown.city_tax !== 0 ? (
                                <li className="flex justify-between px-3 py-2">
                                  <span>{t("hotel.checkout.line.city_tax")}</span>
                                  <span>{eur(folioBreakdown.city_tax)}</span>
                                </li>
                              ) : null}
                              {folioBreakdown.meal_plan_credit !== 0 ? (
                                <li className="flex justify-between px-3 py-2">
                                  <span>{t("hotel.checkout.line.meal_credit")}</span>
                                  <span>{eur(folioBreakdown.meal_plan_credit)}</span>
                                </li>
                              ) : null}
                              {folioBreakdown.payment !== 0 ? (
                                <li className="flex justify-between px-3 py-2">
                                  <span>{t("hotel.checkout.line.payments")}</span>
                                  <span>{eur(folioBreakdown.payment)}</span>
                                </li>
                              ) : null}
                            </ul>
                          )}
                          <div className="rounded-xl border border-rw-line bg-rw-surface px-3 py-2 text-xs text-rw-ink">
                            <div className="flex justify-between">
                              <span>{t("hotel.checkout.subtotal")}</span>
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
                              <span className="font-semibold">{t("hotel.checkout.balance")}</span>
                              <span className="font-semibold">{eur(folioBreakdown.balance)}</span>
                            </div>
                            <p className="mt-2 text-rw-muted">{t("hotel.checkout.city_tax_note")}</p>
                          </div>
                        </>
                      )}
                    </>,
                  )}

                  {stepWrap(
                    2,
                    t("hotel.checkout.s2.title"),
                    s2,
                    <>
                      <p>{t("hotel.checkout.s2.note")}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="block text-xs text-rw-muted">
                          {t("hotel.checkout.pay.amount")}
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
                          {t("hotel.checkout.pay.method")}
                          <select
                            className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2 text-sm text-rw-ink"
                            value={payMethod}
                            onChange={(e) => setPayMethod(e.target.value as HotelManualPaymentMethod)}
                            disabled={!folioForCheckout || payBusy || !checkoutStillInHouse}
                          >
                            <option value="contanti">{t("hotel.checkout.pay.cash")}</option>
                            <option value="carta">{t("hotel.checkout.pay.card")}</option>
                            <option value="bonifico">{t("hotel.checkout.pay.transfer")}</option>
                            <option value="altro">{t("hotel.checkout.pay.other")}</option>
                            <option value="room_charge_settlement">{t("hotel.checkout.pay.internal")}</option>
                          </select>
                        </label>
                      </div>
                      <label className="block text-xs text-rw-muted">
                        {t("hotel.checkout.pay.note_label")}
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
                        {t("hotel.checkout.pay.submit")}
                      </button>
                      {folioForCheckout ? (
                        <p className="text-rw-ink">
                          {t("hotel.checkout.pay.status")}{" "}
                          {owedAfterCityTax <= EPS ? (
                            <span className="font-semibold text-emerald-400">{t("hotel.checkout.pay.covered")}</span>
                          ) : (
                            <span className="font-semibold text-amber-300">
                              {t("hotel.checkout.pay.residual_prefix")} €{owedAfterCityTax.toFixed(2)} {t("hotel.checkout.pay.residual_suffix")}
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
                        {t("hotel.checkout.allow_residual")}
                      </label>
                    </>,
                  )}

                  {stepWrap(
                    3,
                    t("hotel.checkout.s3.title"),
                    s345,
                    <p>{t("hotel.checkout.s3.desc")}</p>,
                  )}

                  {stepWrap(
                    4,
                    t("hotel.checkout.s4.title"),
                    s345,
                    <p>{t("hotel.checkout.s4.desc")}</p>,
                  )}

                  {stepWrap(
                    5,
                    t("hotel.checkout.s5.title"),
                    s345,
                    <p>{t("hotel.checkout.s5.desc")}</p>,
                  )}
                </>
              );
            })()}

            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-rw-ink">
                <Sparkles className="h-4 w-4 text-rw-accent" />
                {t("hotel.checkout.real.title")}
              </p>
              <p className="mt-1 text-xs text-rw-soft">{t("hotel.checkout.real.desc")}</p>
              <div className="mt-3 space-y-2 rounded-xl border border-rw-line bg-rw-surface px-3 py-2 text-xs text-rw-ink">
                <div className="flex justify-between gap-2">
                  <span>{t("hotel.checkout.real.balance")}</span>
                  <span className="font-medium">
                    {folioForCheckout
                      ? new Intl.NumberFormat(fmtLocale, { style: "currency", currency: "EUR" }).format(
                          folioBreakdown.balance,
                        )
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>{t("hotel.checkout.real.city_tax")}</span>
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
                  <span>{t("hotel.checkout.real.total")}</span>
                  <span>
                    {folioForCheckout
                      ? new Intl.NumberFormat(fmtLocale, { style: "currency", currency: "EUR" }).format(owedAfterCityTax)
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>{t("hotel.checkout.real.paid")}</span>
                  <span className="font-medium">
                    {folioForCheckout
                      ? new Intl.NumberFormat(fmtLocale, { style: "currency", currency: "EUR" }).format(
                          folioBreakdown.paidTowardFolio,
                        )
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>{t("hotel.checkout.real.residual")}</span>
                  <span className="font-medium">
                    {folioForCheckout
                      ? new Intl.NumberFormat(fmtLocale, { style: "currency", currency: "EUR" }).format(
                          Math.max(0, owedAfterCityTax),
                        )
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-rw-muted">
                  <span>{t("hotel.checkout.real.method")}</span>
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
                {t("hotel.checkout.confirm")}
              </button>
            </div>
          </div>
        </Card>
      </div>

      {keycards.length > 0 ? (
        <Card
          title={t("hotel.keycards.title")}
          description={t("hotel.keycards.desc")}
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
                      <span className="font-semibold text-rw-ink">{t("hotel.keycards.room")} {room?.code ?? "—"}</span>
                      {reservation ? ` · ${reservation.guestName}` : ""}
                    </span>
                    <span className="text-xs text-rw-muted">
                      {t("hotel.keycards.until")} {new Date(card.validUntil).toLocaleDateString(fmtLocale)}
                    </span>
                  </li>
                );
              })}
            {keycards.filter((card) => card.status === "attiva").length === 0 ? (
              <li className="py-2 text-rw-muted">{t("hotel.keycards.empty")}</li>
            ) : null}
          </ul>
        </Card>
      ) : null}

      <AiChat
        context="hotel"
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        title={t("hotel.checkin.ai_chat_title")}
      />
    </div>
  );
}
