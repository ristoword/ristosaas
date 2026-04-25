"use client";

import Link from "next/link";
import { BedDouble, Bell, CalendarClock, CalendarRange, ConciergeBell, CreditCard, DoorOpen, Sparkles, UserCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { useHotel } from "@/components/hotel/hotel-context";
import { AiChat, AiToggleButton } from "@/components/ai/ai-chat";
import { useState } from "react";
import { todayIso } from "@/lib/date-utils";

export function HotelDashboardPage() {
  const [aiOpen, setAiOpen] = useState(false);
  const { rooms, reservations, housekeeping, folios, charges, ratePlans } = useHotel();
  const today = todayIso();
  const hotelStats = [
    {
      label: "Occupazione",
      value: `${rooms.filter((room) => room.status === "occupata").length}/${rooms.length}`,
      note: "Camere attualmente in soggiorno.",
      icon: BedDouble,
    },
    {
      label: "Arrivi",
      value: String(reservations.filter((reservation) => reservation.checkInDate === today).length),
      note: "Check-in previsti oggi.",
      icon: DoorOpen,
    },
    {
      label: "Partenze",
      value: String(reservations.filter((reservation) => reservation.checkOutDate === today).length),
      note: "Checkout da chiudere alla reception.",
      icon: CreditCard,
    },
    {
      label: "Housekeeping",
      value: String(housekeeping.filter((task) => task.status !== "done").length),
      note: "Camere ancora aperte in housekeeping.",
      icon: Bell,
    },
  ];

  const integrationHighlights = [
    `Folio attivi: ${folios.length}`,
    `Addebiti ristorante su camera registrati: ${charges.length}`,
    "Colazione, mezza pensione e pensione completa visualizzate nel soggiorno hotel.",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hotel Dashboard"
        subtitle="Primo verticale hotel separato dal ristorante, già pronto per evolvere in PMS integrato."
      >
        <Chip label="Verticale" value="Hotel" tone="info" />
        <Chip label="Piano" value="All Included Ready" tone="accent" />
        <AiToggleButton onClick={() => setAiOpen(true)} label="AI Hotel" />
        <Link href="/hotel/folio" className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white">
          <CreditCard className="h-4 w-4" /> Guest Folio
        </Link>
      </PageHeader>

      <Card title="Stato struttura" description="Vista sintetica per reception, direzione e operations.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {hotelStats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-rw-muted">{item.label}</p>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-3 font-display text-3xl font-semibold text-rw-ink">{item.value}</p>
                <p className="mt-2 text-sm text-rw-soft">{item.note}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Backoffice hotel" description="Funzioni da separare nel verticale hotel.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <CalendarRange className="h-5 w-5 text-rw-accent" />
                <p className="font-semibold text-rw-ink">Prenotazioni e disponibilita</p>
              </div>
              <p className="mt-2 text-sm text-rw-soft">Agenda soggiorni, allotment camere, tariffe e no-show.</p>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <DoorOpen className="h-5 w-5 text-rw-accent" />
                <p className="font-semibold text-rw-ink">Check-in / Check-out</p>
              </div>
              <p className="mt-2 text-sm text-rw-soft">Movimenti ospiti, documenti, saldo aperto e tassazione soggiorno.</p>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-rw-accent" />
                <p className="font-semibold text-rw-ink">Housekeeping</p>
              </div>
              <p className="mt-2 text-sm text-rw-soft">Stato camere, pulizie, manutenzioni e priorita operative.</p>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-rw-accent" />
                <p className="font-semibold text-rw-ink">Soggiorni e ospiti</p>
              </div>
              <p className="mt-2 text-sm text-rw-soft">Cliente unico, nucleo ospiti, piani pasti e conto camera.</p>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 sm:col-span-2">
              <p className="font-semibold text-rw-ink">Rate plans attivi</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {ratePlans.map((plan) => (
                  <div key={plan.id} className="rounded-xl border border-rw-line bg-rw-surface px-3 py-2 text-sm">
                    <p className="font-semibold text-rw-ink">{plan.name}</p>
                    <p className="text-xs text-rw-muted">
                      {plan.roomType} · {plan.boardType} · € {plan.nightlyRate}/notte
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Layer di integrazione" description="Valore condiviso tra hotel e ristorante.">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-rw-line bg-rw-surfaceAlt px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-rw-soft">
              <Sparkles className="h-3.5 w-3.5 text-rw-accent" />
              Hotel + Restaurant
            </div>
            {integrationHighlights.map((item) => (
              <div key={item} className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </div>
      {/* Room Service card */}
      <Link href="/hotel/room-service" className="group rounded-2xl border border-rw-line bg-rw-surfaceAlt p-5 transition hover:border-rw-accent/40 hover:bg-rw-surface">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line group-hover:bg-rw-accent group-hover:text-white transition">
            <ConciergeBell className="h-5 w-5" />
          </span>
          <p className="font-semibold text-rw-ink">Room Service</p>
        </div>
        <p className="text-sm text-rw-soft">Food in camera, lavanderia, minibar, pulizia scarpe e servizi extra. Addebito diretto al folio ospite.</p>
      </Link>

      {/* Staff hotel section */}
      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/hotel/turni" className="group rounded-2xl border border-rw-line bg-rw-surfaceAlt p-5 transition hover:border-rw-accent/40 hover:bg-rw-surface">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line group-hover:bg-rw-accent group-hover:text-white transition">
              <CalendarClock className="h-5 w-5" />
            </span>
            <p className="font-semibold text-rw-ink">Turni Hotel</p>
          </div>
          <p className="text-sm text-rw-soft">Pianificazione settimanale e mensile: reception, housekeeping, front office, portineria e direzione.</p>
        </Link>

        <Link href="/hotel/staff" className="group rounded-2xl border border-rw-line bg-rw-surfaceAlt p-5 transition hover:border-rw-accent/40 hover:bg-rw-surface">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line group-hover:bg-rw-accent group-hover:text-white transition">
              <Users className="h-5 w-5" />
            </span>
            <p className="font-semibold text-rw-ink">Staff Hotel</p>
          </div>
          <p className="text-sm text-rw-soft">Gestione dipendenti: reception, concierge, housekeeping, portiere di notte, bellboy, direttore e altro.</p>
        </Link>

        <Link href="/hotel/staff-hr" className="group rounded-2xl border border-rw-line bg-rw-surfaceAlt p-5 transition hover:border-rw-accent/40 hover:bg-rw-surface">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line group-hover:bg-rw-accent group-hover:text-white transition">
              <UserCheck className="h-5 w-5" />
            </span>
            <p className="font-semibold text-rw-ink">HR Hotel</p>
          </div>
          <p className="text-sm text-rw-soft">Presenze, ore lavorate, prospetto ferie/malattia e costo personale alberghiero del mese.</p>
        </Link>
      </div>

      <AiChat context="hotel" open={aiOpen} onClose={() => setAiOpen(false)} title="AI Hotel Front Desk" />
    </div>
  );
}
