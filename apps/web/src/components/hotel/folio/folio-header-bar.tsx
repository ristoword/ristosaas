"use client";

import { StatusPill } from "@/components/shared/status-pill";
import { tf } from "@/core/i18n/interpolate";
import { useI18n } from "@/core/i18n/provider";
import { useI10n } from "@/core/i18n/formatters";
import type { GuestFolio, HotelReservation } from "@/lib/api-client";
import { folioPaymentStatusKey, folioStayStatusKey } from "@/lib/hotel/folio-utils";

type Props = {
  folio: GuestFolio;
  reservation: HotelReservation | null;
  roomCode: string;
  nights: number;
  guestCount: number;
};

export function FolioHeaderBar({ folio, reservation, roomCode, nights, guestCount }: Props) {
  const { t } = useI18n();
  const { formatCurrency } = useI10n();
  const pay = folioPaymentStatusKey(folio.balance, folio.status);
  const stay = reservation ? t(folioStayStatusKey(reservation.status)) : "—";

  return (
    <div className="rounded-2xl border border-rw-line bg-gradient-to-br from-rw-surface to-rw-surfaceAlt p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("hotel.folio.header.label")}</p>
          <h2 className="font-display text-xl font-semibold tracking-tight text-rw-ink sm:text-2xl">
            {folio.guestName || reservation?.guestName || t("hotel.folio.guest.default")}
          </h2>
          <p className="mt-1 text-sm text-rw-soft">
            {t("hotel.folio.header.room")} <strong>{roomCode || "—"}</strong> · {t("hotel.folio.header.folio")}{" "}
            <span className="font-mono text-xs break-all">{folio.id}</span>
          </p>
        </div>
        <div className="sm:text-right">
          <p className="font-display text-2xl font-semibold text-rw-ink sm:text-3xl">
            {formatCurrency(folio.balance)}
          </p>
          <p className="text-xs text-rw-muted">{t("hotel.folio.header.balance")}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusPill tone={reservation?.status === "in_casa" ? "success" : "default"}>{stay}</StatusPill>
        <StatusPill tone={pay.tone === "default" ? "default" : pay.tone}>{t(pay.key)}</StatusPill>
        <StatusPill tone={folio.status === "open" ? "accent" : "success"}>
          {folio.status === "open" ? t("hotel.folio.header.open") : t("hotel.folio.header.closed")}
        </StatusPill>
        {reservation && (
          <>
            <StatusPill>
              {t("hotel.folio.header.checkIn")} {reservation.checkInDate}
            </StatusPill>
            <StatusPill>
              {t("hotel.folio.header.checkOut")} {reservation.checkOutDate}
            </StatusPill>
            <StatusPill>{tf(t, "hotel.folio.header.nights", { n: nights })}</StatusPill>
            <StatusPill>{tf(t, "hotel.folio.header.guests", { n: guestCount })}</StatusPill>
          </>
        )}
      </div>
    </div>
  );
}
