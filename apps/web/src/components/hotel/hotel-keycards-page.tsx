"use client";

import { KeyRound, Link2, RefreshCw, ShieldOff } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { hotelKeycards, hotelReservations, hotelRooms } from "@/modules/hotel/domain/mock-data";

const cardTone = {
  attiva: "success",
  scaduta: "warn",
  annullata: "danger",
} as const;

export function HotelKeycardsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Keycard / Serrature" subtitle="Emissione, rinnovo, revoca e tracciamento card hotel.">
        <Chip label="Card attive" value={hotelKeycards.filter((item) => item.status === "attiva").length} tone="success" />
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Registry keycard" description="Ogni tessera è collegata a camera, prenotazione e operatore.">
          <DataTable
            columns={[
              { key: "id", header: "Card", render: (row) => <span className="font-mono text-xs text-rw-ink">{row.id}</span> },
              {
                key: "roomId",
                header: "Camera",
                render: (row) => {
                  const room = hotelRooms.find((item) => item.id === row.roomId);
                  return <span className="text-rw-ink">{room?.code || row.roomId}</span>;
                },
              },
              {
                key: "reservationId",
                header: "Prenotazione",
                render: (row) => {
                  const reservation = hotelReservations.find((item) => item.id === row.reservationId);
                  return <span className="text-rw-soft">{reservation?.guestName || row.reservationId}</span>;
                },
              },
              { key: "validity", header: "Validità", render: (row) => <span className="text-rw-soft">{row.validFrom.slice(0, 16)} → {row.validUntil.slice(0, 16)}</span> },
              { key: "status", header: "Stato", render: (row) => <Chip label={row.status} tone={cardTone[row.status]} /> },
              { key: "issuedBy", header: "Operatore", render: (row) => <span className="text-rw-soft">{row.issuedBy}</span> },
            ]}
            data={hotelKeycards}
            keyExtractor={(row) => row.id}
          />
        </Card>

        <Card title="Layer integrazione serrature" description="Modulo separato per API o SDK dei produttori lock system.">
          <div className="space-y-3 text-sm text-rw-soft">
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-rw-accent" />
                <p className="font-semibold text-rw-ink">Crea tessera ospite</p>
              </div>
              <p className="mt-2">Validità collegata a camera, check-in e check-out.</p>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-rw-accent" />
                <p className="font-semibold text-rw-ink">Rinnova / estendi</p>
              </div>
              <p className="mt-2">Nuova scadenza senza cambiare la camera o il soggiorno.</p>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <ShieldOff className="h-5 w-5 text-rw-accent" />
                <p className="font-semibold text-rw-ink">Revoca card</p>
              </div>
              <p className="mt-2">Disattivazione immediata su smarrimento o checkout anticipato.</p>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-rw-accent" />
                <p className="font-semibold text-rw-ink">Connector produttori</p>
              </div>
              <p className="mt-2">Punto d’integrazione separato per Salto, VingCard, Dormakaba, Onity e altri.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
