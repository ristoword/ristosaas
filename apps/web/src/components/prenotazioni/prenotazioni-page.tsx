"use client";

import { useCallback, useEffect, useState } from "react";
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
import { BookingEmailPanel } from "@/components/prenotazioni/booking-email-panel";
import { useI18n } from "@/core/i18n/provider";

function fmt(t: (key: string, fallback?: string) => string, key: string, vars?: Record<string, string | number>) {
  let text = t(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, String(v));
  }
  return text;
}

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

const statusTone: Record<BookingStatus, { bg: string; text: string }> = {
  confermata: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  in_attesa: { bg: "bg-amber-500/15", text: "text-amber-400" },
  completata: { bg: "bg-blue-500/15", text: "text-blue-400" },
  annullata: { bg: "bg-red-500/15", text: "text-red-400" },
};

function statusLabel(t: (key: string) => string, status: BookingStatus) {
  return t(`prenotazioni.status.${status}`);
}

const areaOptionKeys = [
  "prenotazioni.area.main",
  "prenotazioni.area.terrace",
  "prenotazioni.area.private",
  "prenotazioni.area.garden",
] as const;
const inputCls = "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

const typeConfig: Record<CustomerProfile["type"], { labelKey: string; icon: typeof Star; cls: string }> = {
  vip: { labelKey: "prenotazioni.customer.vip", icon: Crown, cls: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
  habitue: { labelKey: "prenotazioni.customer.habitue", icon: Star, cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  "walk-in": { labelKey: "prenotazioni.customer.walk-in", icon: User, cls: "border-blue-500/30 bg-blue-500/10 text-blue-400" },
  new: { labelKey: "prenotazioni.customer.new", icon: User, cls: "border-rw-line bg-rw-surfaceAlt text-rw-muted" },
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
  const { t } = useI18n();
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
  const [newTableKey, setNewTableKey] = useState<(typeof areaOptionKeys)[number]>(areaOptionKeys[0]);
  const [newNotes, setNewNotes] = useState("");

  const loadBookings = useCallback(async () => {
    const [bks, custs] = await Promise.all([bookingsApi.list(), customersApi.list()]);
    setBookings(bks);
    const map = new Map<string, CustomerProfile>();
    custs.forEach((c) => map.set(c.name.toLowerCase(), customerToProfile(c)));
    setCustomerMap(map);
  }, []);

  useEffect(() => {
    loadBookings()
      .catch((e) => setError(e instanceof Error ? e.message : t("prenotazioni.error.load")))
      .finally(() => setLoading(false));
  }, [loadBookings]);

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
        table: t(newTableKey),
        notes: newNotes,
        status: "in_attesa",
        allergies: namePreview?.allergies.join(", ") ?? "",
      });
      setBookings((p) => [...p, created]);
      setNewName(""); setNewPhone(""); setNewEmail(""); setNewNotes("");
      setNewGuests(2); setNewTime("20:00");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("prenotazioni.error.save"));
    }
  }

  async function handleDelete(id: string) {
    try {
      await bookingsApi.delete(id);
      setBookings((p) => p.filter((b) => b.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("prenotazioni.error.delete"));
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
      <PageHeader title={t("prenotazioni.title")} subtitle={t("prenotazioni.subtitle")}>
        <Chip label={t("prenotazioni.chip.today")} value={todayBookings.length} tone="accent" />
        <Chip label={t("prenotazioni.chip.confirmed")} value={confermati} tone="success" />
        <Chip label={t("prenotazioni.chip.completed")} value={completati} tone="info" />
        {bookingsWithAllergies.length > 0 && <Chip label={t("prenotazioni.chip.allergies")} value={bookingsWithAllergies.length} tone="danger" />}
        <AiToggleButton onClick={() => setAiOpen(true)} label={t("prenotazioni.ai")} />
      </PageHeader>

      {bookingsWithAllergies.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-400"><AlertTriangle className="h-4 w-4" /> {t("prenotazioni.allergyAlert")}</div>
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
          <BookingEmailPanel onBookingsChanged={loadBookings} />

          <Card title={t("prenotazioni.new.title")} headerRight={<Plus className="h-4 w-4 text-rw-accent" />}>
            <form className="space-y-3" onSubmit={handleAddBooking}>
              <div><label className={labelCls}>{t("prenotazioni.new.date")}</label><input type="date" className={inputCls} value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
              <div><label className={labelCls}>{t("prenotazioni.new.time")}</label><input type="time" className={inputCls} value={newTime} onChange={(e) => setNewTime(e.target.value)} /></div>
              <div>
                <label className={labelCls}>{t("prenotazioni.new.name")}</label>
                <input type="text" placeholder={t("prenotazioni.new.namePlaceholder")} className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} />
                {namePreview && (
                  <div className="mt-2 rounded-lg border border-rw-accent/20 bg-rw-accent/5 px-3 py-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", typeConfig[namePreview.type].cls)}>
                        {(() => { const Icon = typeConfig[namePreview.type].icon; return <Icon className="h-3 w-3" />; })()}
                        {t(typeConfig[namePreview.type].labelKey)}
                      </span>
                      <span className="text-xs text-rw-soft">{fmt(t, "prenotazioni.visits", { n: namePreview.visits })} · {fmt(t, "prenotazioni.avgSpend", { amount: namePreview.avgSpend })}</span>
                    </div>
                    {namePreview.allergies.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-red-400"><AlertTriangle className="h-3 w-3" /> {fmt(t, "prenotazioni.allergyPreview", { list: namePreview.allergies.join(", ") })}</div>
                    )}
                    {namePreview.notes && <p className="text-xs text-rw-muted">{namePreview.notes}</p>}
                  </div>
                )}
              </div>
              <div><label className={labelCls}>{t("prenotazioni.new.phone")}</label><input type="tel" placeholder="+39 ..." className={inputCls} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} /></div>
              <div><label className={labelCls}>{t("prenotazioni.new.email")}</label><input type="email" placeholder="email@..." className={inputCls} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>{t("prenotazioni.new.guests")}</label><input type="number" min={1} value={newGuests} onChange={(e) => setNewGuests(Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>{t("prenotazioni.new.area")}</label><select className={inputCls} value={newTableKey} onChange={(e) => setNewTableKey(e.target.value as (typeof areaOptionKeys)[number])}>{areaOptionKeys.map((key) => <option key={key} value={key}>{t(key)}</option>)}</select></div>
              </div>
              <div><label className={labelCls}>{t("prenotazioni.new.notes")}</label><textarea rows={2} placeholder={t("prenotazioni.new.notesPlaceholder")} className={cn(inputCls, "resize-y")} value={newNotes} onChange={(e) => setNewNotes(e.target.value)} /></div>
              <button type="submit" className={cn(btnPrimary, "w-full")}><Plus className="h-4 w-4" /> {t("prenotazioni.new.save")}</button>
            </form>
          </Card>

          <Card title={t("prenotazioni.filters.title")} headerRight={<Filter className="h-4 w-4 text-rw-muted" />}>
            <div className="space-y-3">
              <div><label className={labelCls}>{t("prenotazioni.filters.date")}</label><input type="date" className={inputCls} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} /></div>
              <div>
                <label className={labelCls}>{t("prenotazioni.filters.status")}</label>
                <select className={inputCls} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">{t("prenotazioni.filters.all")}</option>
                  <option value="confermata">{t("prenotazioni.status.confermata")}</option>
                  <option value="in_attesa">{t("prenotazioni.status.in_attesa")}</option>
                  <option value="completata">{t("prenotazioni.status.completata")}</option>
                  <option value="annullata">{t("prenotazioni.status.annullata")}</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("prenotazioni.filters.search")}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                  <input type="text" placeholder={t("prenotazioni.filters.searchPlaceholder")} className={cn(inputCls, "pl-9")} value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
                </div>
              </div>
              <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl border border-rw-line py-2 text-sm font-semibold text-rw-muted hover:text-rw-soft" onClick={() => { setFilterDate(""); setFilterStatus(""); setFilterSearch(""); }}>
                <RotateCcw className="h-3.5 w-3.5" /> {t("prenotazioni.filters.reset")}
              </button>
            </div>
          </Card>
        </div>

        <Card title={t("prenotazioni.list.title")} description={fmt(t, "prenotazioni.list.results", { n: filtered.length })}>
          <div className="space-y-3">
            {filtered.length === 0 && <p className="py-8 text-center text-sm text-rw-muted">{t("prenotazioni.list.empty")}</p>}
            {filtered.map((b) => {
              const st = statusTone[b.status];
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
                        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", st.bg, st.text)}>{statusLabel(t, b.status)}</span>
                        {customer && (
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", typeConfig[customer.type].cls)}>
                            {(() => { const Icon = typeConfig[customer.type].icon; return <Icon className="h-3 w-3" />; })()}
                            {t(typeConfig[customer.type].labelKey)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-rw-soft">
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{b.date}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{b.time}</span>
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{fmt(t, "prenotazioni.guestsCount", { n: b.guests })}</span>
                        <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{b.phone}</span>
                      </div>
                      <p className="text-xs text-rw-muted"><User className="mr-1 inline h-3 w-3" />{b.table}{b.notes && <> · {b.notes}</>}</p>

                      {allergies.length > 0 && (
                        <div className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-xs font-semibold text-red-400 mt-1">
                          <AlertTriangle className="h-3 w-3" /> {t("prenotazioni.allergies")}: {allergies.join(", ")}
                        </div>
                      )}

                      {customer && (
                        <div className="text-[11px] text-rw-muted mt-1">
                          {fmt(t, "prenotazioni.customerStats", { visits: customer.visits, avg: customer.avgSpend, last: customer.lastVisit })}
                          {customer.notes && <> · {customer.notes}</>}
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => handleDelete(b.id)} className="rounded-lg p-1.5 text-rw-muted hover:bg-red-500/10 hover:text-red-400" title={t("prenotazioni.delete")}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <AiChat context="prenotazioni" open={aiOpen} onClose={() => setAiOpen(false)} title={t("prenotazioni.ai")} />
    </div>
  );
}
