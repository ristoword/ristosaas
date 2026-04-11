"use client";

import { useState } from "react";
import {
  CalendarDays,
  Clock,
  Filter,
  Phone,
  Plus,
  RotateCcw,
  Search,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";

type BookingStatus = "confermato" | "in-attesa" | "arrivato" | "cancellato";

type Booking = {
  id: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  area: string;
  notes: string;
  status: BookingStatus;
};

const statusConfig: Record<BookingStatus, { label: string; bg: string; text: string }> = {
  confermato: { label: "Confermato", bg: "bg-emerald-500/15", text: "text-emerald-400" },
  "in-attesa": { label: "In attesa", bg: "bg-amber-500/15", text: "text-amber-400" },
  arrivato: { label: "Arrivato", bg: "bg-blue-500/15", text: "text-blue-400" },
  cancellato: { label: "Cancellato", bg: "bg-red-500/15", text: "text-red-400" },
};

const mockBookings: Booking[] = [
  { id: "1", name: "Marco Rossi", phone: "+39 333 1234567", date: "2026-04-11", time: "20:00", guests: 4, area: "Sala principale", notes: "Compleanno", status: "confermato" },
  { id: "2", name: "Laura Bianchi", phone: "+39 348 7654321", date: "2026-04-11", time: "20:30", guests: 2, area: "Terrazza", notes: "", status: "in-attesa" },
  { id: "3", name: "Giuseppe Verdi", phone: "+39 320 1112233", date: "2026-04-11", time: "19:30", guests: 6, area: "Sala privata", notes: "Celiaco", status: "arrivato" },
  { id: "4", name: "Anna Neri", phone: "+39 389 4455667", date: "2026-04-11", time: "21:00", guests: 3, area: "Sala principale", notes: "", status: "confermato" },
  { id: "5", name: "Francesco Costa", phone: "+39 347 9988776", date: "2026-04-11", time: "20:00", guests: 8, area: "Sala privata", notes: "Anniversario, menù fisso", status: "in-attesa" },
  { id: "6", name: "Elena Marchetti", phone: "+39 331 5566778", date: "2026-04-12", time: "13:00", guests: 2, area: "Terrazza", notes: "", status: "cancellato" },
];

const areaOptions = ["Sala principale", "Terrazza", "Sala privata", "Giardino"];

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

export function PrenotazioniPage() {
  const [bookings] = useState<Booking[]>(mockBookings);
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const today = "2026-04-11";
  const todayBookings = bookings.filter((b) => b.date === today);
  const confermati = todayBookings.filter((b) => b.status === "confermato").length;
  const arrivati = todayBookings.filter((b) => b.status === "arrivato").length;

  const filtered = bookings.filter((b) => {
    if (filterDate && b.date !== filterDate) return false;
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterSearch && !b.name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Prenotazioni" subtitle="Gestisci le prenotazioni del ristorante" />

      <div className="flex flex-wrap gap-3">
        <Chip label="Oggi" value={todayBookings.length} tone="accent" />
        <Chip label="Confermati" value={confermati} tone="success" />
        <Chip label="Arrivati" value={arrivati} tone="info" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        {/* Left column */}
        <div className="space-y-4">
          <Card title="Nuova prenotazione" headerRight={<Plus className="h-4 w-4 text-rw-accent" />}>
            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className={labelCls}>Data</label>
                <input type="date" className={inputCls} defaultValue={today} />
              </div>
              <div>
                <label className={labelCls}>Ora</label>
                <input type="time" className={inputCls} defaultValue="20:00" />
              </div>
              <div>
                <label className={labelCls}>Nome</label>
                <input type="text" placeholder="Nome cliente" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Telefono</label>
                <input type="tel" placeholder="+39 ..." className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Coperti</label>
                  <input type="number" min={1} defaultValue={2} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Area</label>
                  <select className={inputCls}>
                    {areaOptions.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Note</label>
                <textarea rows={2} placeholder="Allergie, occasioni..." className={cn(inputCls, "resize-y")} />
              </div>
              <button type="submit" className={cn(btnPrimary, "w-full")}>
                <Plus className="h-4 w-4" />
                Salva
              </button>
            </form>
          </Card>

          <Card title="Filtri" headerRight={<Filter className="h-4 w-4 text-rw-muted" />}>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Data</label>
                <input type="date" className={inputCls} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Stato</label>
                <select className={inputCls} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">Tutti</option>
                  <option value="confermato">Confermato</option>
                  <option value="in-attesa">In attesa</option>
                  <option value="arrivato">Arrivato</option>
                  <option value="cancellato">Cancellato</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Cerca</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                  <input
                    type="text"
                    placeholder="Nome cliente..."
                    className={cn(inputCls, "pl-9")}
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rw-line py-2 text-sm font-semibold text-rw-muted hover:text-rw-soft"
                onClick={() => { setFilterDate(""); setFilterStatus(""); setFilterSearch(""); }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset filtri
              </button>
            </div>
          </Card>
        </div>

        {/* Right column – bookings list */}
        <Card title="Elenco prenotazioni" description={`${filtered.length} risultati`}>
          <div className="space-y-3">
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-rw-muted">Nessuna prenotazione trovata.</p>
            )}
            {filtered.map((b) => {
              const st = statusConfig[b.status];
              return (
                <div
                  key={b.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-rw-line bg-rw-surfaceAlt p-4 transition hover:border-rw-accent/25"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-rw-ink">{b.name}</p>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", st.bg, st.text)}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-rw-soft">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{b.date}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{b.time}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{b.guests} coperti</span>
                      <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{b.phone}</span>
                    </div>
                    <p className="text-xs text-rw-muted">
                      <User className="mr-1 inline h-3 w-3" />{b.area}
                      {b.notes && <> · {b.notes}</>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
