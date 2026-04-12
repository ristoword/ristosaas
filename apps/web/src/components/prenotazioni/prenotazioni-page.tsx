"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Crown,
  Filter,
  Loader2,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { AiChat, AiToggleButton } from "@/components/ai/ai-chat";
import {
  bookingsApi,
  customersApi,
  type Booking,
  type Customer,
} from "@/lib/api-client";

type BookingStatus = Booking["status"];

type CustomerProfile = {
  name: string;
  visits: number;
  avgSpend: number;
  type: "vip" | "habitue" | "walk-in" | "new";
  allergies: string[];
  notes: string;
  lastVisit: string;
};

const statusConfig: Record<BookingStatus, { label: string; bg: string; text: string }> = {
  confermata: { label: "Confermata", bg: "bg-emerald-500/15", text: "text-emerald-400" },
  in_attesa: { label: "In attesa", bg: "bg-amber-500/15", text: "text-amber-400" },
  completata: { label: "Completata", bg: "bg-blue-500/15", text: "text-blue-400" },
  annullata: { label: "Annullata", bg: "bg-red-500/15", text: "text-red-400" },
};

const areaOptions = ["Sala principale", "Terrazza", "Sala privata", "Giardino"];
const inputCls = "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

const typeConfig: Record<CustomerProfile["type"], { label: string; icon: typeof Star; cls: string }> = {
  vip: { label: "VIP", icon: Crown, cls: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
  habitue: { label: "Habitué", icon: Star, cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  "walk-in": { label: "Walk-in", icon: User, cls: "border-blue-500/30 bg-blue-500/10 text-blue-400" },
  new: { label: "Nuovo", icon: User, cls: "border-rw-line bg-rw-surfaceAlt text-rw-muted" },
};

function parseList(s: string): string[] {
  return s ? s.split(",").map((x) => x.trim()).filter(Boolean) : [];
}

function customerToProfile(c: Customer): CustomerProfile {
  return {
    name: c.name,
    visits: c.visits,
    avgSpend: c.avgSpend,
    type: c.type,
    allergies: parseList(c.allergies),
    notes: c.notes,
    lastVisit: c.lastVisit,
  };
}

export function PrenotazioniPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customerMap, setCustomerMap] = useState<Map<string, CustomerProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [aiOpen, setAiOpen] = useState(false);

  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTime, setNewTime] = useState("20:00");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newGuests, setNewGuests] = useState(2);
  const [newTable, setNewTable] = useState(areaOptions[0]);
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    Promise.all([bookingsApi.list(), customersApi.list()])
      .then(([bks, custs]) => {
        setBookings(bks);
        const map = new Map<string, CustomerProfile>();
        custs.forEach((c) => map.set(c.name.toLowerCase(), customerToProfile(c)));
        setCustomerMap(map);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayBookings = bookings.filter((b) => b.date === today);
  const confermati = todayBookings.filter((b) => b.status === "confermata").length;
  const completati = todayBookings.filter((b) => b.status === "completata").length;

  const filtered = bookings.filter((b) => {
    if (filterDate && b.date !== filterDate) return false;
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterSearch && !b.customerName.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  function getCustomer(name: string): CustomerProfile | null {
    return customerMap.get(name.toLowerCase()) ?? null;
  }

  const bookingsWithAllergies = todayBookings.filter((b) => {
    const allergiesFromBooking = parseList(b.allergies);
    const c = getCustomer(b.customerName);
    return allergiesFromBooking.length > 0 || (c && c.allergies.length > 0);
  });

  const namePreview = getCustomer(newName);

  async function handleAddBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const created = await bookingsApi.create({
        customerName: newName.trim(),
        phone: newPhone,
        email: newEmail,
        date: newDate,
        time: newTime,
        guests: newGuests,
        table: newTable,
        notes: newNotes,
        status: "in_attesa",
        allergies: namePreview?.allergies.join(", ") ?? "",
      });
      setBookings((p) => [...p, created]);
      setNewName(""); setNewPhone(""); setNewEmail(""); setNewNotes("");
      setNewGuests(2); setNewTime("20:00");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Errore nel salvataggio");
    }
  }

  async function handleDelete(id: string) {
    try {
      await bookingsApi.delete(id);
      setBookings((p) => p.filter((b) => b.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Errore nella cancellazione");
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rw-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-red-400">
        <AlertTriangle className="h-8 w-8" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Prenotazioni" subtitle="Gestisci le prenotazioni con AI">
        <Chip label="Oggi" value={todayBookings.length} tone="accent" />
        <Chip label="Confermate" value={confermati} tone="success" />
        <Chip label="Completate" value={completati} tone="info" />
        {bookingsWithAllergies.length > 0 && <Chip label="Con allergie" value={bookingsWithAllergies.length} tone="danger" />}
        <AiToggleButton onClick={() => setAiOpen(true)} label="AI Prenotazioni" />
      </PageHeader>

      {bookingsWithAllergies.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-400"><AlertTriangle className="h-4 w-4" /> Attenzione: clienti con allergie/intolleranze oggi</div>
          {bookingsWithAllergies.map((b) => {
            const c = getCustomer(b.customerName);
            const allergies = [
              ...parseList(b.allergies),
              ...(c ? c.allergies.filter((a) => !parseList(b.allergies).includes(a)) : []),
            ];
            return (
              <div key={b.id} className="text-sm text-amber-300">
                <span className="font-semibold">{b.customerName}</span> ({b.time}, {b.table}): {allergies.join(", ")}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <Card title="Nuova prenotazione" headerRight={<Plus className="h-4 w-4 text-rw-accent" />}>
            <form className="space-y-3" onSubmit={handleAddBooking}>
              <div><label className={labelCls}>Data</label><input type="date" className={inputCls} value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
              <div><label className={labelCls}>Ora</label><input type="time" className={inputCls} value={newTime} onChange={(e) => setNewTime(e.target.value)} /></div>
              <div>
                <label className={labelCls}>Nome</label>
                <input type="text" placeholder="Nome cliente" className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} />
                {namePreview && (
                  <div className="mt-2 rounded-lg border border-rw-accent/20 bg-rw-accent/5 px-3 py-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", typeConfig[namePreview.type].cls)}>
                        {(() => { const Icon = typeConfig[namePreview.type].icon; return <Icon className="h-3 w-3" />; })()}
                        {typeConfig[namePreview.type].label}
                      </span>
                      <span className="text-xs text-rw-soft">{namePreview.visits} visite · media €{namePreview.avgSpend}</span>
                    </div>
                    {namePreview.allergies.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-red-400"><AlertTriangle className="h-3 w-3" /> Allergie: {namePreview.allergies.join(", ")}</div>
                    )}
                    {namePreview.notes && <p className="text-xs text-rw-muted">{namePreview.notes}</p>}
                  </div>
                )}
              </div>
              <div><label className={labelCls}>Telefono</label><input type="tel" placeholder="+39 ..." className={inputCls} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} /></div>
              <div><label className={labelCls}>Email</label><input type="email" placeholder="email@..." className={inputCls} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Coperti</label><input type="number" min={1} value={newGuests} onChange={(e) => setNewGuests(Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>Area</label><select className={inputCls} value={newTable} onChange={(e) => setNewTable(e.target.value)}>{areaOptions.map((a) => <option key={a}>{a}</option>)}</select></div>
              </div>
              <div><label className={labelCls}>Note</label><textarea rows={2} placeholder="Allergie, occasioni..." className={cn(inputCls, "resize-y")} value={newNotes} onChange={(e) => setNewNotes(e.target.value)} /></div>
              <button type="submit" className={cn(btnPrimary, "w-full")}><Plus className="h-4 w-4" /> Salva</button>
            </form>
          </Card>

          <Card title="Filtri" headerRight={<Filter className="h-4 w-4 text-rw-muted" />}>
            <div className="space-y-3">
              <div><label className={labelCls}>Data</label><input type="date" className={inputCls} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} /></div>
              <div>
                <label className={labelCls}>Stato</label>
                <select className={inputCls} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">Tutti</option>
                  <option value="confermata">Confermata</option>
                  <option value="in_attesa">In attesa</option>
                  <option value="completata">Completata</option>
                  <option value="annullata">Annullata</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Cerca</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                  <input type="text" placeholder="Nome cliente..." className={cn(inputCls, "pl-9")} value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
                </div>
              </div>
              <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl border border-rw-line py-2 text-sm font-semibold text-rw-muted hover:text-rw-soft" onClick={() => { setFilterDate(""); setFilterStatus(""); setFilterSearch(""); }}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset filtri
              </button>
            </div>
          </Card>
        </div>

        <Card title="Elenco prenotazioni" description={`${filtered.length} risultati`}>
          <div className="space-y-3">
            {filtered.length === 0 && <p className="py-8 text-center text-sm text-rw-muted">Nessuna prenotazione trovata.</p>}
            {filtered.map((b) => {
              const st = statusConfig[b.status];
              const customer = getCustomer(b.customerName);
              const allergies = [
                ...parseList(b.allergies),
                ...(customer ? customer.allergies.filter((a) => !parseList(b.allergies).includes(a)) : []),
              ];
              return (
                <div key={b.id} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4 transition hover:border-rw-accent/25">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-rw-ink">{b.customerName}</p>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", st.bg, st.text)}>{st.label}</span>
                        {customer && (
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", typeConfig[customer.type].cls)}>
                            {(() => { const Icon = typeConfig[customer.type].icon; return <Icon className="h-3 w-3" />; })()}
                            {typeConfig[customer.type].label}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-rw-soft">
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{b.date}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{b.time}</span>
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{b.guests} coperti</span>
                        <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{b.phone}</span>
                      </div>
                      <p className="text-xs text-rw-muted"><User className="mr-1 inline h-3 w-3" />{b.table}{b.notes && <> · {b.notes}</>}</p>

                      {allergies.length > 0 && (
                        <div className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-xs font-semibold text-red-400 mt-1">
                          <AlertTriangle className="h-3 w-3" /> Allergie: {allergies.join(", ")}
                        </div>
                      )}

                      {customer && (
                        <div className="text-[11px] text-rw-muted mt-1">
                          {customer.visits} visite · Media €{customer.avgSpend} · Ultima: {customer.lastVisit}
                          {customer.notes && <> · {customer.notes}</>}
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => handleDelete(b.id)} className="rounded-lg p-1.5 text-rw-muted hover:bg-red-500/10 hover:text-red-400" title="Elimina">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <AiChat context="prenotazioni" open={aiOpen} onClose={() => setAiOpen(false)} title="AI Prenotazioni" />
    </div>
  );
}
