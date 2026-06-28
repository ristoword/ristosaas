"use client";

import { cn } from "@/lib/utils";
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
    <div className="rounded-3xl border border-rw-line bg-gradient-to-br from-rw-surface to-rw-surfaceAlt p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Guest Folio</p>
          <h2 className="font-display text-2xl font-semibold text-rw-ink">
            {folio.guestName || reservation?.guestName || "Ospite"}
          </h2>
          <p className="mt-1 text-sm text-rw-soft">
            Camera <strong>{roomCode || "—"}</strong> · Folio <span className="font-mono text-xs">{folio.id}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-semibold text-rw-ink">
            {folio.currency} {folio.balance.toFixed(2)}
          </p>
          <p className="text-xs text-rw-muted">Saldo totale</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge label={stay} tone={reservation?.status === "in_casa" ? "success" : "default"} />
        <Badge label={pay.label} tone={pay.tone} />
        <Badge label={folio.status === "open" ? "Folio aperto" : "Folio chiuso"} tone={folio.status === "open" ? "accent" : "success"} />
        {reservation && (
          <>
            <Badge label={`Check-in ${reservation.checkInDate}`} tone="default" />
            <Badge label={`Check-out ${reservation.checkOutDate}`} tone="default" />
            <Badge label={`${nights} notti`} tone="default" />
            <Badge label={`${guestCount} ospiti`} tone="default" />
          </>
        )}
      </div>
    </div>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warn" | "danger" | "default" | "accent";
}) {
  const cls = {
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    danger: "border-red-500/30 bg-red-500/10 text-red-400",
    accent: "border-rw-accent/30 bg-rw-accent/10 text-rw-accent",
    default: "border-rw-line bg-rw-surfaceAlt text-rw-soft",
  }[tone];
  return <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", cls)}>{label}</span>;
}
