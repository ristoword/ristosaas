"use client";

import { StatusPill } from "@/components/shared/status-pill";
import type { GuestFolio, HotelReservation } from "@/lib/api-client";
import { paymentStatusLabel, stayStatusLabel } from "@/lib/hotel/folio-utils";

type Props = {
  folio: GuestFolio;
  reservation: HotelReservation | null;
  roomCode: string;
  nights: number;
  guestCount: number;
};

export function FolioHeaderBar({ folio, reservation, roomCode, nights, guestCount }: Props) {
  const pay = paymentStatusLabel(folio.balance, folio.status);
  const stay = stayStatusLabel(reservation);

  return (
    <div className="rounded-2xl border border-rw-line bg-gradient-to-br from-rw-surface to-rw-surfaceAlt p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Guest Folio</p>
          <h2 className="font-display text-xl font-semibold tracking-tight text-rw-ink sm:text-2xl">
            {folio.guestName || reservation?.guestName || "Ospite"}
          </h2>
          <p className="mt-1 text-sm text-rw-soft">
            Camera <strong>{roomCode || "—"}</strong> · Folio <span className="font-mono text-xs break-all">{folio.id}</span>
          </p>
        </div>
        <div className="sm:text-right">
          <p className="font-display text-2xl font-semibold text-rw-ink sm:text-3xl">
            {folio.currency} {folio.balance.toFixed(2)}
          </p>
          <p className="text-xs text-rw-muted">Saldo totale</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusPill tone={reservation?.status === "in_casa" ? "success" : "default"}>{stay}</StatusPill>
        <StatusPill tone={pay.tone === "default" ? "default" : pay.tone}>{pay.label}</StatusPill>
        <StatusPill tone={folio.status === "open" ? "accent" : "success"}>
          {folio.status === "open" ? "Folio aperto" : "Folio chiuso"}
        </StatusPill>
        {reservation && (
          <>
            <StatusPill>Check-in {reservation.checkInDate}</StatusPill>
            <StatusPill>Check-out {reservation.checkOutDate}</StatusPill>
            <StatusPill>{nights} notti</StatusPill>
            <StatusPill>{guestCount} ospiti</StatusPill>
          </>
        )}
      </div>
    </div>
  );
}
