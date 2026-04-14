"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CreditCard, DoorOpen, IdCard, UserRoundCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { useHotel } from "@/components/hotel/hotel-context";
import { AiChat, AiToggleButton } from "@/components/ai/ai-chat";

export function HotelFrontDeskPage() {
  const { reservations, finalizeCheckout } = useHotel();
  const [aiOpen, setAiOpen] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState("");
  const [cityTax, setCityTax] = useState("6");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "room_charge_settlement">("card");
  const arrivals = useMemo(() => reservations.filter((item) => item.status === "confermata"), [reservations]);
  const inHouse = useMemo(() => reservations.filter((item) => item.status === "in_casa"), [reservations]);

  return (
    <div className="space-y-6">
      <PageHeader title="Check-in / Check-out" subtitle="Flusso operativo principale reception: arrivo, permanenza, partenza.">
        <Chip label="Da check-in" value={arrivals.length} tone="info" />
        <Chip label="In casa" value={inHouse.length} tone="success" />
        <AiToggleButton onClick={() => setAiOpen(true)} label="AI Check-in/out" />
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Check-in" description="Sequenza minima operativa quando arriva l’ospite.">
          <div className="space-y-3">
            {[
              { icon: DoorOpen, title: "Apri prenotazione", body: "Verifichi arrivo, date, ospiti e camera disponibile." },
              { icon: IdCard, title: "Controlla documento", body: "Registri i dati dell’ospite e la validità del soggiorno." },
              { icon: UserRoundCheck, title: "Assegna camera", body: "Camera, tariffa, occupanti e soggiorno diventano attivi." },
              { icon: CreditCard, title: "Emetti keycard", body: "Crei tessera con validità collegata a camera e prenotazione." },
              { icon: CheckCircle2, title: "Stato finale", body: "Camera = occupata, prenotazione = in casa." },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-rw-ink">{step.title}</p>
                      <p className="text-sm text-rw-soft">{step.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Check-out" description="Chiusura soggiorno e passaggio camera a housekeeping.">
          <div className="space-y-3">
            {[
              "Chiudi il conto finale del soggiorno.",
              "Disattivi la keycard e registri l’uscita.",
              "La prenotazione passa a check-out completato.",
              "La camera passa a da pulire.",
              "Dopo housekeeping torna disponibile.",
            ].map((step, index) => (
              <div key={step} className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
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
                  <option value="">Seleziona ospite in casa</option>
                  {inHouse.map((reservation) => (
                    <option key={reservation.id} value={reservation.id}>
                      {reservation.guestName} · camera {reservation.roomId?.replace("hr_", "") || "n/d"}
                    </option>
                  ))}
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
                <button
                  type="button"
                  disabled={!selectedCheckout}
                  className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                  onClick={() => finalizeCheckout(selectedCheckout, parseFloat(cityTax) || 0, paymentMethod).catch(console.error)}
                >
                  <CreditCard className="h-4 w-4" />
                  Chiudi checkout e folio
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>
      <AiChat context="hotel" open={aiOpen} onClose={() => setAiOpen(false)} title="AI Hotel Check-in/out e Pagamenti" />
    </div>
  );
}
