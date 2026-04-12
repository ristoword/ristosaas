"use client";

import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { useHotel } from "@/components/hotel/hotel-context";

export function HotelFolioPage() {
  const { folios, charges, reservations } = useHotel();

  return (
    <div className="space-y-6">
      <PageHeader title="Guest Folio" subtitle="Conto unico ospite con movimenti hotel e ristorante.">
        <Chip label="Folios" value={folios.length} tone="accent" />
        <Chip label="Addebiti" value={charges.length} tone="info" />
      </PageHeader>

      <Card title="Folio attivi" description="Saldo ospite pronto per room charge, pagamenti e check-out.">
        <DataTable
          columns={[
            { key: "id", header: "Folio", render: (row) => <span className="font-mono text-xs text-rw-ink">{row.id}</span> },
            {
              key: "stayId",
              header: "Ospite",
              render: (row) => {
                const reservation = reservations.find((item) => item.id === row.stayId);
                return (
                  <div>
                    <p className="font-semibold text-rw-ink">{reservation?.guestName || row.customerId}</p>
                    <p className="text-xs text-rw-muted">
                      {reservation?.roomId ? `Camera ${reservation.roomId.replace("hr_", "")}` : "Camera non assegnata"}
                    </p>
                  </div>
                );
              },
            },
            { key: "balance", header: "Saldo", render: (row) => <span className="font-semibold text-rw-ink">€ {row.balance.toFixed(2)}</span> },
            { key: "currency", header: "Valuta", render: (row) => <span className="text-rw-soft">{row.currency}</span> },
            { key: "status", header: "Stato", render: (row) => <Chip label={row.status} tone={row.status === "closed" ? "success" : "accent"} /> },
          ]}
          data={folios}
          keyExtractor={(row) => row.id}
          emptyMessage="Nessun guest folio creato"
        />
      </Card>

      <Card title="Movimenti integrati" description="Dettaglio di tutto ciò che confluisce nel conto finale dell’ospite.">
        <DataTable
          columns={[
            { key: "postedAt", header: "Data", render: (row) => <span className="text-rw-soft">{row.postedAt.slice(0, 16).replace("T", " ")}</span> },
            { key: "description", header: "Descrizione", render: (row) => <span className="text-rw-ink">{row.description}</span> },
            {
              key: "source",
              header: "Sorgente",
              render: (row) => (
                <Chip
                  label={row.source}
                  tone={row.source === "restaurant" ? "accent" : row.source === "payment" ? "success" : row.source === "city_tax" ? "warn" : "default"}
                />
              ),
            },
            {
              key: "amount",
              header: "Importo",
              render: (row) => (
                <span className={row.amount < 0 ? "font-semibold text-emerald-400" : "font-semibold text-rw-ink"}>
                  € {row.amount.toFixed(2)}
                </span>
              ),
            },
          ]}
          data={charges}
          keyExtractor={(row) => row.id}
          emptyMessage="Nessun movimento integrato registrato"
        />
      </Card>

      <Card title="Metodi pagamento finali" description="Il checkout chiude il folio registrando il metodo usato in settlement.">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
            <p className="font-semibold text-rw-ink">Carta</p>
            <p className="mt-2">Pagamento classico al front desk con POS o gateway.</p>
          </div>
          <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
            <p className="font-semibold text-rw-ink">Contanti</p>
            <p className="mt-2">Chiusura cassa diretta con tracciamento nel movement log.</p>
          </div>
          <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
            <p className="font-semibold text-rw-ink">Saldo interno</p>
            <p className="mt-2">Utile per strutture con conto centralizzato o corporate billing.</p>
          </div>
        </div>
      </Card>

      <Card title="Use case operativo" description="Per front desk, cassa e direzione.">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
            <p className="font-semibold text-rw-ink">1. Consumo ristorante</p>
            <p className="mt-2">La cassa seleziona un ordine servito e lo addebita alla camera dell’ospite interno.</p>
          </div>
          <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
            <p className="font-semibold text-rw-ink">2. Folio ospite</p>
            <p className="mt-2">Il movimento entra nello stesso conto del soggiorno e resta visibile alla reception.</p>
          </div>
          <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
            <p className="font-semibold text-rw-ink">3. Check-out</p>
            <p className="mt-2">Al checkout l’ospite chiude un conto unico, con hotel + ristorante.</p>
          </div>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm text-rw-muted">
          <CreditCard className="h-4 w-4 text-rw-accent" />
          Room charge, piani pasti e conto unico ospite stanno nello stesso flusso PMS/POS.
        </div>
      </Card>
    </div>
  );
}
