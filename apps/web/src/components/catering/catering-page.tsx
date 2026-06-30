"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calculator,
  ChefHat,
  FilePlus2,
  Loader2,
  Minus,
  Plus,
  Save,
  Trash2,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { cateringApi, type CateringEvent } from "@/lib/api-client";
import { computeCateringQuote } from "@/lib/catering/calculator";
import {
  emptyQuote,
  quoteMenuSummary,
  uid,
  type CateringCourse,
  type CateringDishLine,
  type CateringQuoteData,
} from "@/lib/catering/types";
import { DishPickerModal, type PickedDish } from "@/components/catering/dish-picker-modal";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";

const GOLD_CARD =
  "rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-b from-rw-surface to-rw-surfaceAlt/90 shadow-[0_4px_24px_rgba(0,0,0,0.18)]";
const GOLD_BTN =
  "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-[#D4AF37]/50 bg-gradient-to-b from-[#D4AF37]/25 to-[#D4AF37]/5 px-5 text-sm font-bold uppercase tracking-wide text-[#E8C547] transition hover:border-[#D4AF37] hover:from-[#D4AF37]/35 active:scale-[0.98] disabled:opacity-50";
const INPUT =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink focus:border-[#D4AF37]/50 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30";
const LABEL = "block text-xs font-bold uppercase tracking-wide text-rw-muted mb-1.5";

const STATUS_OPTIONS: CateringEvent["status"][] = ["preventivo", "confermato", "completato", "annullato"];

const statusColors = {
  preventivo: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  confermato: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  completato: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  annullato: "bg-red-500/15 text-red-400 border-red-500/30",
} as const;

function parseQuote(event: CateringEvent | null): CateringQuoteData {
  if (event?.quoteData?.version === 1) {
    return {
      ...event.quoteData,
      guests: event.guests || event.quoteData.guests || 1,
    };
  }
  return emptyQuote(event?.guests || 50);
}

function newDish(partial?: Partial<CateringDishLine>): CateringDishLine {
  return {
    id: uid("d"),
    name: "",
    sourceType: "manual",
    sourceId: null,
    unitCost: 0,
    sellPrice: 0,
    qtyPerGuest: 1,
    ...partial,
  };
}

export function CateringPage() {
  const [events, setEvents] = useState<CateringEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [clientBudget, setClientBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<CateringEvent["status"]>("preventivo");
  const [depositPaid, setDepositPaid] = useState(false);
  const [quote, setQuote] = useState<CateringQuoteData>(() => emptyQuote());

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCourseId, setPickerCourseId] = useState<string | null>(null);

  const calc = useMemo(
    () => computeCateringQuote({ ...quote, guests: quote.guests }, parseFloat(clientBudget) || 0),
    [quote, clientBudget],
  );

  const fetchEvents = useCallback(async () => {
    try {
      const data = await cateringApi.list();
      setEvents(data);
    } catch {
      setFlash("Errore caricamento eventi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3500);
  }

  function loadEvent(event: CateringEvent) {
    setActiveId(event.id);
    setName(event.name);
    setContact(event.contact);
    setPhone(event.phone);
    setDate(event.date);
    setVenue(event.venue);
    setClientBudget(String(event.budget || ""));
    setNotes(event.notes);
    setStatus(event.status);
    setDepositPaid(event.depositPaid);
    setQuote(parseQuote(event));
  }

  function startNewEvent() {
    setActiveId(null);
    setName("");
    setContact("");
    setPhone("");
    setDate(new Date().toISOString().slice(0, 10));
    setVenue("");
    setClientBudget("");
    setNotes("");
    setStatus("preventivo");
    setDepositPaid(false);
    setQuote(emptyQuote(50));
  }

  function patchQuote(patch: Partial<CateringQuoteData>) {
    setQuote((q) => ({ ...q, ...patch }));
  }

  function patchCourse(courseId: string, patch: Partial<CateringCourse>) {
    setQuote((q) => ({
      ...q,
      courses: q.courses.map((c) => (c.id === courseId ? { ...c, ...patch } : c)),
    }));
  }

  function patchDish(courseId: string, dishId: string, patch: Partial<CateringDishLine>) {
    setQuote((q) => ({
      ...q,
      courses: q.courses.map((c) =>
        c.id === courseId
          ? { ...c, dishes: c.dishes.map((d) => (d.id === dishId ? { ...d, ...patch } : d)) }
          : c,
      ),
    }));
  }

  function addCourse() {
    setQuote((q) => ({
      ...q,
      courses: [...q.courses, { id: uid("c"), name: `Portata ${q.courses.length + 1}`, dishes: [] }],
    }));
  }

  function removeCourse(courseId: string) {
    setQuote((q) => ({
      ...q,
      courses: q.courses.length <= 1 ? q.courses : q.courses.filter((c) => c.id !== courseId),
    }));
  }

  function addDish(courseId: string, partial?: Partial<CateringDishLine>) {
    setQuote((q) => ({
      ...q,
      courses: q.courses.map((c) =>
        c.id === courseId ? { ...c, dishes: [...c.dishes, newDish(partial)] } : c,
      ),
    }));
  }

  function removeDish(courseId: string, dishId: string) {
    setQuote((q) => ({
      ...q,
      courses: q.courses.map((c) =>
        c.id === courseId ? { ...c, dishes: c.dishes.filter((d) => d.id !== dishId) } : c,
      ),
    }));
  }

  function openPicker(courseId: string) {
    setPickerCourseId(courseId);
    setPickerOpen(true);
  }

  function handlePickedDish(picked: PickedDish) {
    if (!pickerCourseId) return;
    addDish(pickerCourseId, {
      name: picked.name,
      sourceType: picked.sourceType,
      sourceId: picked.sourceId,
      unitCost: picked.unitCost,
      sellPrice: picked.sellPrice,
      qtyPerGuest: 1,
    });
  }

  function addExtra() {
    setQuote((q) => ({
      ...q,
      extras: [...q.extras, { id: uid("e"), label: "Spesa extra", amount: 0, perPerson: false }],
    }));
  }

  function removeExtra(extraId: string) {
    setQuote((q) => ({
      ...q,
      extras: q.extras.length <= 1 ? q.extras : q.extras.filter((e) => e.id !== extraId),
    }));
  }

  async function handleSave() {
    if (!name.trim() || !contact.trim()) {
      showFlash("Nome evento e contatto sono obbligatori");
      return;
    }
    setSaving(true);
    const payload: Omit<CateringEvent, "id"> = {
      name: name.trim(),
      contact: contact.trim(),
      phone: phone.trim(),
      date: date || new Date().toISOString().slice(0, 10),
      guests: quote.guests,
      venue: venue.trim(),
      budget: parseFloat(clientBudget) || calc.revenueTotal,
      menu: quoteMenuSummary(quote),
      notes: notes.trim(),
      status,
      depositPaid,
      quoteData: { ...quote, depositAmount: quote.depositAmount },
    };
    try {
      if (activeId) {
        const updated = await cateringApi.update(activeId, payload);
        setEvents((prev) => prev.map((e) => (e.id === activeId ? updated : e)));
        loadEvent(updated);
        showFlash("Evento aggiornato");
      } else {
        const created = await cateringApi.create(payload);
        setEvents((prev) => [created, ...prev]);
        loadEvent(created);
        showFlash("Evento creato");
      }
    } catch (e) {
      showFlash(e instanceof Error ? e.message : "Salvataggio non riuscito");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await cateringApi.delete(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (activeId === id) startNewEvent();
      showFlash("Evento eliminato");
    } catch {
      showFlash("Eliminazione non riuscita");
    }
  }

  const confirmedCount = events.filter((e) => e.status === "confermato").length;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Catering Enterprise" subtitle="Preventivi, food cost, ricavi e margini in tempo reale">
        <Chip label="Eventi" value={events.length} tone="accent" />
        <Chip label="Confermati" value={confirmedCount} tone="success" />
        <Chip label="Margine" value={`${calc.marginPct.toFixed(1)}%`} tone={calc.marginPct >= 0 ? "success" : "danger"} />
      </PageHeader>

      {flash && (
        <div className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-3 text-sm font-semibold text-[#E8C547]">
          {flash}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {/* Toolbar */}
          <div className={`${GOLD_CARD} flex flex-wrap items-center gap-2 p-3`}>
            <button type="button" className={GOLD_BTN} onClick={startNewEvent}>
              <FilePlus2 className="h-4 w-4" /> Nuovo
            </button>
            <button type="button" className={cn(GOLD_BTN, "flex-1 sm:flex-none")} disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {activeId ? "Salva modifiche" : "Salva evento"}
            </button>
            {activeId && (
              <button
                type="button"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 text-sm font-bold text-red-300"
                onClick={() => void handleDelete(activeId)}
              >
                <Trash2 className="h-4 w-4" /> Elimina
              </button>
            )}
          </div>

          {/* Anagrafica */}
          <div className={`${GOLD_CARD} p-4 sm:p-5`}>
            <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-[#D4AF37]">
              Anagrafica evento
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={LABEL}>Nome evento</label><input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="Matrimonio, cena aziendale…" /></div>
              <div><label className={LABEL}>Contatto</label><input className={INPUT} value={contact} onChange={(e) => setContact(e.target.value)} /></div>
              <div><label className={LABEL}>Telefono</label><input className={INPUT} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><label className={LABEL}>Data</label><input type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div><label className={LABEL}>Location</label><input className={INPUT} value={venue} onChange={(e) => setVenue(e.target.value)} /></div>
              <div><label className={LABEL}>Budget cliente (€)</label><input type="number" step="0.01" className={INPUT} value={clientBudget} onChange={(e) => setClientBudget(e.target.value)} placeholder="Opzionale" /></div>
              <div>
                <label className={LABEL}>Stato</label>
                <select className={INPUT} value={status} onChange={(e) => setStatus(e.target.value as CateringEvent["status"])}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink">
                  <input type="checkbox" checked={depositPaid} onChange={(e) => setDepositPaid(e.target.checked)} className="accent-[#D4AF37]" />
                  Acconto ricevuto
                </label>
              </div>
              <div className="sm:col-span-2"><label className={LABEL}>Note</label><textarea className={cn(INPUT, "resize-y")} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>
          </div>

          {/* Ospiti */}
          <div className={`${GOLD_CARD} p-4 sm:p-5`}>
            <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-[#D4AF37]">
              Numero ospiti
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#D4AF37]/40 bg-rw-surfaceAlt text-rw-ink hover:border-[#D4AF37]" onClick={() => patchQuote({ guests: Math.max(1, quote.guests - 1) })}>
                <Minus className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#D4AF37]" />
                <span className="font-display text-3xl font-bold tabular-nums text-rw-ink">{quote.guests}</span>
              </div>
              <button type="button" className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#D4AF37]/40 bg-rw-surfaceAlt text-rw-ink hover:border-[#D4AF37]" onClick={() => patchQuote({ guests: quote.guests + 1 })}>
                <Plus className="h-5 w-5" />
              </button>
              <input type="number" min={1} className={cn(INPUT, "w-28")} value={quote.guests} onChange={(e) => patchQuote({ guests: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
            </div>
          </div>

          {/* Portate */}
          <div className={`${GOLD_CARD} p-4 sm:p-5`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-[#D4AF37]">Menu e piatti</h3>
              <button type="button" className="inline-flex items-center gap-1 rounded-xl border border-[#D4AF37]/40 px-3 py-1.5 text-xs font-bold text-[#E8C547]" onClick={addCourse}>
                <Plus className="h-3.5 w-3.5" /> Portata
              </button>
            </div>
            <div className="space-y-4">
              {quote.courses.map((course) => (
                <div key={course.id} className="rounded-xl border border-rw-line/50 bg-rw-surfaceAlt/50 p-3">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <ChefHat className="h-4 w-4 text-[#D4AF37]" />
                    <input className={cn(INPUT, "max-w-xs flex-1 font-semibold")} value={course.name} onChange={(e) => patchCourse(course.id, { name: e.target.value })} />
                    <button type="button" className="rounded-lg border border-rw-line px-2 py-1 text-xs text-rw-muted hover:text-red-400" onClick={() => removeCourse(course.id)}>Rimuovi portata</button>
                  </div>
                  <div className="space-y-2">
                    {course.dishes.map((dish) => (
                      <div key={dish.id} className="grid gap-2 rounded-lg border border-rw-line/40 bg-rw-surface p-2 sm:grid-cols-[1fr_repeat(3,minmax(5rem,7rem))_auto] sm:items-end">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-rw-muted">Piatto</label>
                          <input className={cn(INPUT, "py-2 text-xs")} value={dish.name} onChange={(e) => patchDish(course.id, dish.id, { name: e.target.value })} placeholder="Nome piatto" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-rw-muted">Costo €</label>
                          <input type="number" step="0.01" min={0} className={cn(INPUT, "py-2 text-xs")} value={dish.unitCost} onChange={(e) => patchDish(course.id, dish.id, { unitCost: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-rw-muted">Prezzo €</label>
                          <input type="number" step="0.01" min={0} className={cn(INPUT, "py-2 text-xs")} value={dish.sellPrice} onChange={(e) => patchDish(course.id, dish.id, { sellPrice: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-rw-muted">Q.tà/ospite</label>
                          <div className="flex items-center gap-1">
                            <button type="button" className="rounded border border-rw-line p-1" onClick={() => patchDish(course.id, dish.id, { qtyPerGuest: Math.max(0, dish.qtyPerGuest - 1) })}><Minus className="h-3 w-3" /></button>
                            <input type="number" min={0} step="0.1" className={cn(INPUT, "w-14 py-1 text-center text-xs")} value={dish.qtyPerGuest} onChange={(e) => patchDish(course.id, dish.id, { qtyPerGuest: Math.max(0, parseFloat(e.target.value) || 0) })} />
                            <button type="button" className="rounded border border-rw-line p-1" onClick={() => patchDish(course.id, dish.id, { qtyPerGuest: dish.qtyPerGuest + 1 })}><Plus className="h-3 w-3" /></button>
                          </div>
                        </div>
                        <button type="button" className="rounded p-2 text-rw-muted hover:text-red-400" onClick={() => removeDish(course.id, dish.id)}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="inline-flex items-center gap-1 text-xs font-bold text-[#E8C547]" onClick={() => addDish(course.id)}>
                      <Plus className="h-3 w-3" /> Piatto manuale
                    </button>
                    <button type="button" className="inline-flex items-center gap-1 text-xs font-bold text-[#E8C547]" onClick={() => openPicker(course.id)}>
                      <UtensilsCrossed className="h-3 w-3" /> Da ricetta / menu
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spese extra */}
          <div className={`${GOLD_CARD} p-4 sm:p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-[#D4AF37]">Spese extra</h3>
              <button type="button" className="inline-flex items-center gap-1 text-xs font-bold text-[#E8C547]" onClick={addExtra}><Plus className="h-3 w-3" /> Voce</button>
            </div>
            <div className="space-y-2">
              {quote.extras.map((extra) => (
                <div key={extra.id} className="grid gap-2 rounded-lg border border-rw-line/40 bg-rw-surfaceAlt/60 p-2 sm:grid-cols-[1fr_8rem_auto_auto] sm:items-center">
                  <input className={cn(INPUT, "py-2 text-xs")} value={extra.label} onChange={(e) => setQuote((q) => ({ ...q, extras: q.extras.map((x) => x.id === extra.id ? { ...x, label: e.target.value } : x) }))} />
                  <input type="number" step="0.01" className={cn(INPUT, "py-2 text-xs")} value={extra.amount} onChange={(e) => setQuote((q) => ({ ...q, extras: q.extras.map((x) => x.id === extra.id ? { ...x, amount: parseFloat(e.target.value) || 0 } : x) }))} />
                  <label className="inline-flex items-center gap-1 text-xs text-rw-muted">
                    <input type="checkbox" checked={extra.perPerson} onChange={(e) => setQuote((q) => ({ ...q, extras: q.extras.map((x) => x.id === extra.id ? { ...x, perPerson: e.target.checked } : x) }))} className="accent-[#D4AF37]" />
                    A persona
                  </label>
                  <button type="button" className="rounded p-1 text-rw-muted hover:text-red-400" onClick={() => removeExtra(extra.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Prezzo override */}
          <div className={`${GOLD_CARD} p-4 sm:p-5`}>
            <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-[#D4AF37]">Prezzo vendita personalizzato</h3>
            <label className="mb-3 inline-flex items-center gap-2 text-sm text-rw-ink">
              <input type="checkbox" checked={quote.usePriceOverride} onChange={(e) => patchQuote({ usePriceOverride: e.target.checked })} className="accent-[#D4AF37]" />
              Usa prezzo fisso a persona (ignora somma prezzi piatti)
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL}>€ / persona</label>
                <input type="number" step="0.01" min={0} disabled={!quote.usePriceOverride} className={INPUT} value={quote.pricePerPersonOverride ?? ""} onChange={(e) => patchQuote({ pricePerPersonOverride: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className={LABEL}>Acconto (€)</label>
                <input type="number" step="0.01" min={0} className={INPUT} value={quote.depositAmount} onChange={(e) => patchQuote({ depositAmount: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar calcoli */}
        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className={`${GOLD_CARD} p-4`}>
            <div className="mb-3 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-[#D4AF37]" />
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-[#D4AF37]">Riepilogo economico</h3>
            </div>
            <p className="mb-4 text-center font-display text-3xl font-bold text-[#E8C547]">€ {calc.revenueTotal.toFixed(2)}</p>
            <p className="mb-4 text-center text-xs text-rw-muted">Ricavo totale preventivo</p>
            <ul className="space-y-2 text-sm">
              <KpiRow label="Ospiti" value={String(calc.guests)} />
              <KpiRow label="Portate / piatti" value={`${calc.courseCount} / ${calc.dishCount}`} />
              <KpiRow label="Costo food" value={`€ ${calc.foodCostTotal.toFixed(2)}`} sub={`€ ${calc.foodCostPerPerson.toFixed(2)}/pax`} />
              <KpiRow label="Spese extra" value={`€ ${calc.extrasCostTotal.toFixed(2)}`} sub={`€ ${calc.extrasCostPerPerson.toFixed(2)}/pax`} />
              <KpiRow label="Spese totali" value={`€ ${calc.totalExpenses.toFixed(2)}`} sub={`€ ${calc.expensePerPerson.toFixed(2)}/pax`} accent />
              <KpiRow label="Ricavo / persona" value={`€ ${calc.revenuePerPerson.toFixed(2)}`} />
              <KpiRow label="Utile lordo" value={`€ ${calc.grossProfit.toFixed(2)}`} sub={`€ ${calc.profitPerPerson.toFixed(2)}/pax`} positive={calc.grossProfit >= 0} />
              <KpiRow label="Margine %" value={`${calc.marginPct.toFixed(1)}%`} positive={calc.marginPct >= 0} />
              <KpiRow label="Budget cliente" value={`€ ${calc.clientBudget.toFixed(2)}`} />
              <KpiRow label="Delta budget" value={`€ ${calc.budgetDelta.toFixed(2)}`} positive={calc.budgetDelta >= 0} />
              <KpiRow label="Acconto" value={`€ ${calc.depositAmount.toFixed(2)}`} />
              <KpiRow label="Saldo da incassare" value={`€ ${calc.balanceAfterDeposit.toFixed(2)}`} accent />
            </ul>
          </div>

          {/* Lista eventi */}
          <div className={`${GOLD_CARD} p-4`}>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-rw-muted">Eventi salvati</h3>
            {loading ? (
              <p className="text-sm text-rw-muted">Caricamento…</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-rw-muted">Nessun evento. Crea il primo preventivo.</p>
            ) : (
              <ul className="max-h-[420px] space-y-2 overflow-y-auto">
                {events.map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => loadEvent(ev)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-2.5 text-left transition",
                        activeId === ev.id
                          ? "border-[#D4AF37]/50 bg-[#D4AF37]/10"
                          : "border-rw-line/40 bg-rw-surfaceAlt/40 hover:border-[#D4AF37]/30",
                      )}
                    >
                      <p className="truncate font-semibold text-rw-ink">{ev.name}</p>
                      <p className="text-xs text-rw-muted">{ev.date} · {ev.guests} ospiti · € {ev.budget.toFixed(0)}</p>
                      <span className={cn("mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize", statusColors[ev.status])}>
                        {ev.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <DishPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={handlePickedDish} />
    </div>
  );
}

function KpiRow({
  label,
  value,
  sub,
  positive,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  accent?: boolean;
}) {
  return (
    <li className="flex items-start justify-between gap-2 rounded-lg bg-rw-surfaceAlt/70 px-3 py-2">
      <span className="text-rw-muted">{label}</span>
      <div className="text-right">
        <span
          className={cn(
            "font-bold tabular-nums",
            accent ? "text-[#E8C547]" : positive === true ? "text-emerald-400" : positive === false ? "text-red-400" : "text-rw-ink",
          )}
        >
          {value}
        </span>
        {sub && <p className="text-[10px] text-rw-muted">{sub}</p>}
      </div>
    </li>
  );
}
