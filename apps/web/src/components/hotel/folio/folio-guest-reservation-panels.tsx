"use client";

import type { Customer, HotelReservation, RatePlan } from "@/lib/api-client";
import { boardTypeLabel, ratePlanLabel } from "@/lib/hotel/folio-utils";
import { Card } from "@/components/shared/card";

type Props = {
  customer: Customer | null;
  reservation: HotelReservation | null;
  ratePlans: RatePlan[];
};

export function FolioGuestReservationPanels({ customer, reservation, ratePlans }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Informazioni ospite">
        <dl className="grid gap-2 text-sm">
          <Row label="Nome completo" value={customer?.name || reservation?.guestName || "—"} />
          <Row label="Documento" value={reservation?.documentCode || "—"} />
          <Row label="Telefono" value={customer?.phone || reservation?.phone || "—"} />
          <Row label="Email" value={customer?.email || reservation?.email || "—"} />
          <Row label="VIP" value={customer?.type === "vip" ? "Sì" : "No"} highlight={customer?.type === "vip"} />
          <Row label="Loyalty" value={customer ? `${customer.visits} visite · €${customer.totalSpent.toFixed(0)}` : "—"} />
          <Row label="Note Reception" value={customer?.notes || customer?.preferences || "—"} />
          <Row label="Allergie" value={customer?.allergies || "—"} />
        </dl>
      </Card>
      <Card title="Prenotazione">
        {reservation ? (
          <dl className="grid gap-2 text-sm">
            <Row label="N. prenotazione" value={reservation.id} mono />
            <Row label="Canale" value="Direct / PMS" />
            <Row label="Tariffa" value={`€ ${reservation.rate.toFixed(2)} / notte`} />
            <Row label="Piano tariffario" value={ratePlanLabel(reservation, ratePlans)} />
            <Row label="Pensione" value={boardTypeLabel(reservation.boardType)} />
            <Row label="Adulti" value={String(reservation.guests)} />
            <Row label="Notti" value={String(reservation.nights)} />
            <Row label="Tipo camera" value={reservation.roomType} />
            <Row label="Stato" value={reservation.status} />
          </dl>
        ) : (
          <p className="text-sm text-rw-muted">Nessuna prenotazione collegata al folio.</p>
        )}
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 border-b border-rw-line/40 py-1.5">
      <dt className="text-rw-muted">{label}</dt>
      <dd className={mono ? "font-mono text-xs text-rw-ink" : highlight ? "font-semibold text-amber-400" : "text-right text-rw-ink"}>
        {value}
      </dd>
    </div>
  );
}
