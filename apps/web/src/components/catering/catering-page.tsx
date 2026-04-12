"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Calculator,
  ChefHat,
  Minus,
  Plus,
  Printer,
  Save,
  Trash2,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { cateringApi, type CateringEvent } from "@/lib/api-client";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { Card } from "@/components/shared/card";
import { TabBar } from "@/components/shared/tab-bar";
import { DataTable } from "@/components/shared/data-table";

type CalcPortata = { nome: string; piatti: string[] };

const TABS = [
  { id: "eventi", label: "Eventi" },
  { id: "builder", label: "Nuovo evento" },
  { id: "calcolatore", label: "Calcolatore" },
];

const COURSE_TYPES = [
  { id: "3", label: "3 portate" },
  { id: "4", label: "4 portate" },
  { id: "5", label: "5 portate" },
  { id: "6", label: "6 portate" },
  { id: "deg", label: "Degustazione" },
];

const DEFAULT_COURSE_NAMES: Record<string, string[]> = {
  "3": ["Antipasto", "Primo", "Dolce"],
  "4": ["Antipasto", "Primo", "Secondo", "Dolce"],
  "5": ["Antipasto", "Primo", "Secondo", "Contorno", "Dolce"],
  "6": ["Antipasto", "Primo", "Secondo", "Contorno", "Pre-dessert", "Dolce"],
  deg: ["Amuse-bouche", "Crudo", "Primo", "Intermezzo", "Secondo", "Pre-dessert", "Dolce"],
};

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";
const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink transition hover:border-rw-accent/30 active:scale-[0.98]";

const statusColors = {
  preventivo: "bg-blue-500/15 text-blue-400",
  confermato: "bg-emerald-500/15 text-emerald-400",
  completato: "bg-slate-500/15 text-slate-400",
  annullato: "bg-red-500/15 text-red-400",
} as const;

export function CateringPage() {
  const [tab, setTab] = useState("eventi");
  const [events, setEvents] = useState<CateringEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await cateringApi.list();
      setEvents(data);
    } catch (err) {
      console.error("Failed to fetch catering events:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  /* ---- Builder form ---- */
  const [bName, setBName] = useState("");
  const [bContact, setBContact] = useState("");
  const [bPhone, setBPhone] = useState("");
  const [bDate, setBDate] = useState("");
  const [bGuests, setBGuests] = useState("");
  const [bVenue, setBVenue] = useState("");
  const [bBudget, setBBudget] = useState("");
  const [bMenu, setBMenu] = useState("");
  const [bNotes, setBNotes] = useState("");

  /* ---- Calculator ---- */
  const [cPersone, setCPersone] = useState(50);
  const [cTipoPortate, setCTipoPortate] = useState("4");
  const [cPortate, setCPortate] = useState<CalcPortata[]>(
    DEFAULT_COURSE_NAMES["4"].map((n) => ({ nome: n, piatti: [""] })),
  );
  const [cExtraLocation, setCExtraLocation] = useState("");
  const [cExtraServizio, setCExtraServizio] = useState("");
  const [cExtraAttrezzatura, setCExtraAttrezzatura] = useState("");
  const [cResult, setCResult] = useState<{ perPersona: number; totale: number; extra: number } | null>(null);

  /* ---- Builder handler ---- */
  async function handleSaveEvent() {
    if (!bName.trim() || !bContact.trim()) return;
    try {
      const created = await cateringApi.create({
        name: bName.trim(),
        contact: bContact.trim(),
        phone: bPhone.trim(),
        date: bDate || new Date().toISOString().slice(0, 10),
        guests: parseInt(bGuests) || 0,
        venue: bVenue.trim(),
        budget: parseFloat(bBudget) || 0,
        menu: bMenu.trim(),
        notes: bNotes.trim(),
        status: "preventivo",
        depositPaid: false,
      });
      setEvents((prev) => [...prev, created]);
      setBName(""); setBContact(""); setBPhone(""); setBDate("");
      setBGuests(""); setBVenue(""); setBBudget(""); setBMenu(""); setBNotes("");
      setTab("eventi");
    } catch (err) {
      console.error("Failed to create event:", err);
    }
  }

  async function handleDeleteEvent(id: string) {
    try {
      await cateringApi.delete(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  }

  /* ---- Calculator handlers ---- */
  function handleCourseTypeChange(tipo: string) {
    setCTipoPortate(tipo);
    setCPortate(
      (DEFAULT_COURSE_NAMES[tipo] ?? DEFAULT_COURSE_NAMES["4"]).map((n) => ({ nome: n, piatti: [""] })),
    );
    setCResult(null);
  }

  function handleCalcola() {
    const basePP = cTipoPortate === "deg" ? 75 : 12 * parseInt(cTipoPortate);
    const extra =
      (parseFloat(cExtraLocation) || 0) +
      (parseFloat(cExtraServizio) || 0) +
      (parseFloat(cExtraAttrezzatura) || 0);
    const totale = basePP * cPersone + extra;
    setCResult({ perPersona: basePP + extra / (cPersone || 1), totale, extra });
  }

  /* ---- Table columns ---- */
  const eventCols = [
    { key: "name", header: "Evento", render: (r: CateringEvent) => <span className="font-medium text-rw-ink">{r.name}</span> },
    { key: "contact", header: "Contatto" },
    { key: "date", header: "Data" },
    { key: "guests", header: "Ospiti" },
    { key: "venue", header: "Location" },
    { key: "budget", header: "Budget", render: (r: CateringEvent) => <span className="font-semibold text-rw-ink">€{r.budget.toFixed(2)}</span> },
    {
      key: "status", header: "Stato",
      render: (r: CateringEvent) => (
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", statusColors[r.status])}>
          {r.status}
        </span>
      ),
    },
    {
      key: "depositPaid", header: "Acconto",
      render: (r: CateringEvent) =>
        r.depositPaid ? (
          <span className="text-xs font-semibold text-emerald-400">Pagato</span>
        ) : (
          <span className="text-xs font-semibold text-amber-400">No</span>
        ),
    },
    {
      key: "actions", header: "",
      render: (r: CateringEvent) => (
        <button type="button" onClick={() => handleDeleteEvent(r.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Catering" subtitle="Gestione eventi e calcolatore costi">
        <Chip label="Eventi" value={events.length} tone="accent" />
        <Chip label="Confermati" value={events.filter((e) => e.status === "confermato").length} tone="success" />
      </PageHeader>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* ============================================================ */}
      {/*  TAB: Eventi                                                  */}
      {/* ============================================================ */}
      {tab === "eventi" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Chip label="Totale" value={events.length} />
            <Chip label="Preventivi" value={events.filter((e) => e.status === "preventivo").length} tone="info" />
            <Chip label="Confermati" value={events.filter((e) => e.status === "confermato").length} tone="success" />
            <Chip label="Completati" value={events.filter((e) => e.status === "completato").length} tone="warn" />
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-rw-muted">Caricamento eventi…</p>
            </div>
          ) : (
            <DataTable columns={eventCols} data={events} keyExtractor={(r) => r.id} emptyMessage="Nessun evento registrato" />
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/*  TAB: Event builder                                          */}
      {/* ============================================================ */}
      {tab === "builder" && (
        <Card title="Nuovo evento" description="Configura un evento catering completo.">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={labelCls}>Nome evento</label><input className={inputCls} value={bName} onChange={(e) => setBName(e.target.value)} placeholder="Cena aziendale…" /></div>
              <div><label className={labelCls}>Contatto</label><input className={inputCls} value={bContact} onChange={(e) => setBContact(e.target.value)} placeholder="Nome e cognome" /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className={labelCls}>Telefono</label><input className={inputCls} value={bPhone} onChange={(e) => setBPhone(e.target.value)} placeholder="+39…" /></div>
              <div><label className={labelCls}>Data</label><input type="date" className={inputCls} value={bDate} onChange={(e) => setBDate(e.target.value)} /></div>
              <div><label className={labelCls}>N° ospiti</label><input type="number" className={inputCls} value={bGuests} onChange={(e) => setBGuests(e.target.value)} placeholder="40" /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={labelCls}>Location</label><input className={inputCls} value={bVenue} onChange={(e) => setBVenue(e.target.value)} placeholder="Sala, villa, esterno…" /></div>
              <div><label className={labelCls}>Budget (€)</label><input type="number" step="0.01" className={inputCls} value={bBudget} onChange={(e) => setBBudget(e.target.value)} placeholder="5000.00" /></div>
            </div>
            <div><label className={labelCls}>Menu</label><textarea className={cn(inputCls, "resize-y")} rows={2} value={bMenu} onChange={(e) => setBMenu(e.target.value)} placeholder="Descrizione menu…" /></div>
            <div><label className={labelCls}>Note</label><textarea className={cn(inputCls, "resize-y")} rows={2} value={bNotes} onChange={(e) => setBNotes(e.target.value)} placeholder="Location, esigenze speciali…" /></div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className={btnPrimary} onClick={handleSaveEvent}>
                <Save className="h-4 w-4" /> Salva evento
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/*  TAB: Calcolatore                                             */}
      {/* ============================================================ */}
      {tab === "calcolatore" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Card title="Numero persone">
              <div className="flex items-center gap-4">
                <button type="button" className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-rw-line bg-rw-surfaceAlt text-rw-ink active:bg-rw-surface" onClick={() => setCPersone((n) => Math.max(1, n - 5))}>
                  <Minus className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-rw-accent" />
                  <span className="font-display text-3xl font-semibold tabular-nums text-rw-ink">{cPersone}</span>
                </div>
                <button type="button" className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-rw-line bg-rw-surfaceAlt text-rw-ink active:bg-rw-surface" onClick={() => setCPersone((n) => Math.min(500, n + 5))}>
                  <Plus className="h-5 w-5" />
                </button>
                <input type="number" className={cn(inputCls, "w-24")} value={cPersone} onChange={(e) => setCPersone(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
            </Card>

            <Card title="Tipo di servizio">
              <div className="flex flex-wrap gap-2">
                {COURSE_TYPES.map((ct) => (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => handleCourseTypeChange(ct.id)}
                    className={cn(
                      "rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                      cTipoPortate === ct.id
                        ? "border-rw-accent bg-rw-accent/15 text-rw-accent"
                        : "border-rw-line bg-rw-surfaceAlt text-rw-muted hover:border-rw-accent/30 hover:text-rw-soft",
                    )}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </Card>

            <Card title="Composizione menù" description="Personalizza le portate per il preventivo.">
              <div className="space-y-3">
                {cPortate.map((pt, pi) => (
                  <div key={pi} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <ChefHat className="h-4 w-4 text-rw-accent" />
                      <input
                        className={cn(inputCls, "flex-1 bg-rw-surface py-2 text-xs font-semibold")}
                        value={pt.nome}
                        onChange={(e) => setCPortate((p) => p.map((pp, i) => (i === pi ? { ...pp, nome: e.target.value } : pp)))}
                      />
                    </div>
                    {pt.piatti.map((pl, pli) => (
                      <div key={pli} className="flex items-center gap-2 pl-5">
                        <UtensilsCrossed className="h-3 w-3 text-rw-muted" />
                        <input
                          className={cn(inputCls, "flex-1 bg-rw-surface py-1.5 text-xs")}
                          value={pl}
                          onChange={(e) =>
                            setCPortate((p) =>
                              p.map((pp, i) =>
                                i === pi ? { ...pp, piatti: pp.piatti.map((x, j) => (j === pli ? e.target.value : x)) } : pp,
                              ),
                            )
                          }
                          placeholder="Nome piatto…"
                        />
                        {pt.piatti.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setCPortate((p) =>
                                p.map((pp, i) => (i === pi ? { ...pp, piatti: pp.piatti.filter((_, j) => j !== pli) } : pp)),
                              )
                            }
                            className="rounded p-1 text-rw-muted hover:text-red-400"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setCPortate((p) =>
                          p.map((pp, i) => (i === pi ? { ...pp, piatti: [...pp.piatti, ""] } : pp)),
                        )
                      }
                      className="ml-5 inline-flex items-center gap-1 text-[11px] font-semibold text-rw-accent hover:underline"
                    >
                      <Plus className="h-3 w-3" /> Piatto
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Costi extra">
              <div className="grid gap-3 sm:grid-cols-3">
                <div><label className={labelCls}>Location (€)</label><input type="number" step="0.01" className={inputCls} value={cExtraLocation} onChange={(e) => setCExtraLocation(e.target.value)} placeholder="0.00" /></div>
                <div><label className={labelCls}>Servizio (€)</label><input type="number" step="0.01" className={inputCls} value={cExtraServizio} onChange={(e) => setCExtraServizio(e.target.value)} placeholder="0.00" /></div>
                <div><label className={labelCls}>Attrezzatura (€)</label><input type="number" step="0.01" className={inputCls} value={cExtraAttrezzatura} onChange={(e) => setCExtraAttrezzatura(e.target.value)} placeholder="0.00" /></div>
              </div>
            </Card>

            <button type="button" className={cn(btnPrimary, "w-full py-3 text-base")} onClick={handleCalcola}>
              <Calculator className="h-5 w-5" /> Calcola preventivo
            </button>
          </div>

          <div className="space-y-4">
            <Card title="Riepilogo" description="Risultato del calcolo">
              {cResult ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-rw-surfaceAlt p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Totale stimato</p>
                    <p className="mt-1 font-display text-3xl font-semibold text-rw-accent">€{cResult.totale.toFixed(2)}</p>
                  </div>
                  <ul className="space-y-2">
                    <li className="flex justify-between rounded-lg bg-rw-surfaceAlt px-3 py-2">
                      <span className="text-sm text-rw-soft">Persone</span>
                      <span className="font-semibold text-rw-ink">{cPersone}</span>
                    </li>
                    <li className="flex justify-between rounded-lg bg-rw-surfaceAlt px-3 py-2">
                      <span className="text-sm text-rw-soft">Costo/persona</span>
                      <span className="font-semibold text-rw-ink">€{cResult.perPersona.toFixed(2)}</span>
                    </li>
                    <li className="flex justify-between rounded-lg bg-rw-surfaceAlt px-3 py-2">
                      <span className="text-sm text-rw-soft">Costi extra</span>
                      <span className="font-semibold text-rw-ink">€{cResult.extra.toFixed(2)}</span>
                    </li>
                    <li className="flex justify-between rounded-lg bg-rw-surfaceAlt px-3 py-2">
                      <span className="text-sm text-rw-soft">Tipo servizio</span>
                      <span className="font-semibold text-rw-ink capitalize">
                        {COURSE_TYPES.find((c) => c.id === cTipoPortate)?.label}
                      </span>
                    </li>
                    <li className="flex justify-between rounded-lg bg-rw-surfaceAlt px-3 py-2">
                      <span className="text-sm text-rw-soft">Portate</span>
                      <span className="font-semibold text-rw-ink">{cPortate.length}</span>
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <Calculator className="h-10 w-10 text-rw-muted" />
                  <p className="text-sm text-rw-muted">
                    Configura il servizio e premi <span className="font-semibold text-rw-accent">Calcola preventivo</span> per vedere il riepilogo.
                  </p>
                </div>
              )}
            </Card>

            {cResult && (
              <Card title="Menu selezionato">
                <ul className="space-y-1.5">
                  {cPortate.filter((pt) => pt.nome.trim()).map((pt, i) => (
                    <li key={i} className="rounded-lg bg-rw-surfaceAlt px-3 py-2">
                      <p className="text-xs font-semibold text-rw-soft">{pt.nome}</p>
                      {pt.piatti.filter((p) => p.trim()).length > 0 && (
                        <p className="text-xs text-rw-muted">{pt.piatti.filter((p) => p.trim()).join(", ")}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
