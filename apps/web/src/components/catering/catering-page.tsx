"use client";

import { useState } from "react";
import {
  CalendarDays,
  Calculator,
  ChefHat,
  Copy,
  Grape,
  ListPlus,
  Minus,
  Plus,
  Printer,
  Save,
  Trash2,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { Card } from "@/components/shared/card";
import { TabBar } from "@/components/shared/tab-bar";
import { DataTable } from "@/components/shared/data-table";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PortataPreset = { id: string; nome: string; piatti: string[] };

type CateringPreset = {
  id: string;
  nome: string;
  descrizione: string;
  prezzoPersona: number;
  note: string;
  portate: PortataPreset[];
};

type CateringEvent = {
  id: string;
  titolo: string;
  cliente: string;
  data: string;
  ospiti: number;
  prezzoPersona: number;
  presetId: string | null;
  note: string;
  stato: "confermato" | "in attesa" | "completato";
};

type CalcPortata = { nome: string; piatti: string[] };

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const mockPresets: CateringPreset[] = [
  {
    id: "p1",
    nome: "Classico italiano",
    descrizione: "Menu tradizionale con 4 portate della cucina regionale italiana.",
    prezzoPersona: 55,
    note: "Ideale per eventi aziendali",
    portate: [
      { id: "pp1", nome: "Antipasti", piatti: ["Bruschette miste", "Carpaccio di vitello"] },
      { id: "pp2", nome: "Primi", piatti: ["Risotto allo zafferano", "Penne all'arrabbiata"] },
      { id: "pp3", nome: "Secondi", piatti: ["Tagliata di manzo", "Branzino al forno"] },
      { id: "pp4", nome: "Dolci", piatti: ["Tiramisù", "Panna cotta ai frutti di bosco"] },
    ],
  },
  {
    id: "p2",
    nome: "Degustazione mare",
    descrizione: "6 portate di pesce fresco con abbinamento vini.",
    prezzoPersona: 85,
    note: "Richiede conferma pesce 48h prima",
    portate: [
      { id: "pp5", nome: "Crudo", piatti: ["Tartare di tonno", "Ostriche"] },
      { id: "pp6", nome: "Antipasto caldo", piatti: ["Frittura di paranza"] },
      { id: "pp7", nome: "Primo", piatti: ["Spaghetti alle vongole"] },
      { id: "pp8", nome: "Secondo", piatti: ["Grigliata mista di pesce"] },
      { id: "pp9", nome: "Pre-dessert", piatti: ["Sorbetto al limone"] },
      { id: "pp10", nome: "Dolce", piatti: ["Semifreddo al pistacchio"] },
    ],
  },
  {
    id: "p3",
    nome: "Buffet informale",
    descrizione: "Finger food e piatti da condivisione, perfetto per aperitivi.",
    prezzoPersona: 35,
    note: "Minimo 20 persone",
    portate: [
      { id: "pp11", nome: "Finger food salati", piatti: ["Mini arancini", "Crostini assortiti", "Polpettine"] },
      { id: "pp12", nome: "Taglieri", piatti: ["Salumi e formaggi", "Verdure grigliate"] },
      { id: "pp13", nome: "Dolci", piatti: ["Mini cannoli", "Bignè assortiti"] },
    ],
  },
  {
    id: "p4",
    nome: "Vegano gourmet",
    descrizione: "Menu interamente vegetale con ingredienti di stagione.",
    prezzoPersona: 50,
    note: "Tutti gli ingredienti biologici e km0",
    portate: [
      { id: "pp14", nome: "Antipasti", piatti: ["Hummus con crudité", "Tartare di barbabietola"] },
      { id: "pp15", nome: "Primo", piatti: ["Ravioli di zucca con salvia"] },
      { id: "pp16", nome: "Secondo", piatti: ["Burger di lenticchie", "Verdure al forno"] },
      { id: "pp17", nome: "Dolce", piatti: ["Mousse al cioccolato fondente"] },
    ],
  },
];

const mockEvents: CateringEvent[] = [
  { id: "e1", titolo: "Cena aziendale TechCorp", cliente: "Marco Ferri", data: "2026-04-25", ospiti: 40, prezzoPersona: 55, presetId: "p1", note: "Sala conferenze piano 2", stato: "confermato" },
  { id: "e2", titolo: "Matrimonio Rossi-Bianchi", cliente: "Anna Rossi", data: "2026-05-10", ospiti: 120, prezzoPersona: 85, presetId: "p2", note: "Location esterna Villa Medici", stato: "in attesa" },
  { id: "e3", titolo: "Aperitivo inaugurazione", cliente: "Studio Legale Conti", data: "2026-04-05", ospiti: 60, prezzoPersona: 35, presetId: "p3", note: "", stato: "completato" },
];

const TABS = [
  { id: "preset", label: "Preset menù" },
  { id: "builder", label: "Event builder" },
  { id: "eventi", label: "Eventi" },
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CateringPage() {
  const [tab, setTab] = useState("preset");
  const [presets, setPresets] = useState<CateringPreset[]>(mockPresets);
  const [events, setEvents] = useState<CateringEvent[]>(mockEvents);

  /* ---- Preset form ---- */
  const [pNome, setPNome] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pPrezzo, setPPrezzo] = useState("");
  const [pNote, setPNote] = useState("");
  const [pPortate, setPPortate] = useState<PortataPreset[]>([
    { id: "new-1", nome: "Antipasti", piatti: [""] },
  ]);

  /* ---- Builder form ---- */
  const [bTitolo, setBTitolo] = useState("");
  const [bCliente, setBCliente] = useState("");
  const [bData, setBData] = useState("");
  const [bOspiti, setBOspiti] = useState("");
  const [bPrezzo, setBPrezzo] = useState("");
  const [bNote, setBNote] = useState("");
  const [bPresetId, setBPresetId] = useState("");

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

  /* ---- Preset handlers ---- */
  function addPortataSection() {
    setPPortate((p) => [...p, { id: `new-${Date.now()}`, nome: "", piatti: [""] }]);
  }

  function removePortataSection(idx: number) {
    setPPortate((p) => p.filter((_, i) => i !== idx));
  }

  function updatePortataNome(idx: number, nome: string) {
    setPPortate((p) => p.map((pt, i) => (i === idx ? { ...pt, nome } : pt)));
  }

  function addPiattoToPortata(portataIdx: number) {
    setPPortate((p) =>
      p.map((pt, i) => (i === portataIdx ? { ...pt, piatti: [...pt.piatti, ""] } : pt)),
    );
  }

  function updatePiatto(portataIdx: number, piattoIdx: number, value: string) {
    setPPortate((p) =>
      p.map((pt, i) =>
        i === portataIdx
          ? { ...pt, piatti: pt.piatti.map((pl, j) => (j === piattoIdx ? value : pl)) }
          : pt,
      ),
    );
  }

  function removePiatto(portataIdx: number, piattoIdx: number) {
    setPPortate((p) =>
      p.map((pt, i) =>
        i === portataIdx
          ? { ...pt, piatti: pt.piatti.filter((_, j) => j !== piattoIdx) }
          : pt,
      ),
    );
  }

  function handleSavePreset() {
    if (!pNome.trim()) return;
    const id = `p${Date.now()}`;
    const portate = pPortate
      .filter((pt) => pt.nome.trim())
      .map((pt) => ({ ...pt, piatti: pt.piatti.filter((pl) => pl.trim()) }));
    setPresets((p) => [
      ...p,
      { id, nome: pNome.trim(), descrizione: pDesc, prezzoPersona: parseFloat(pPrezzo) || 0, note: pNote, portate },
    ]);
    setPNome(""); setPDesc(""); setPPrezzo(""); setPNote("");
    setPPortate([{ id: "new-1", nome: "Antipasti", piatti: [""] }]);
  }

  /* ---- Builder handler ---- */
  function handleSaveEvent() {
    if (!bTitolo.trim() || !bCliente.trim()) return;
    const id = `e${Date.now()}`;
    setEvents((p) => [
      ...p,
      {
        id,
        titolo: bTitolo.trim(),
        cliente: bCliente.trim(),
        data: bData || new Date().toISOString().slice(0, 10),
        ospiti: parseInt(bOspiti) || 0,
        prezzoPersona: parseFloat(bPrezzo) || 0,
        presetId: bPresetId || null,
        note: bNote,
        stato: "in attesa",
      },
    ]);
    setBTitolo(""); setBCliente(""); setBData(""); setBOspiti("");
    setBPrezzo(""); setBNote(""); setBPresetId("");
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
    { key: "titolo", header: "Evento", render: (r: CateringEvent) => <span className="font-medium text-rw-ink">{r.titolo}</span> },
    { key: "cliente", header: "Cliente" },
    { key: "data", header: "Data" },
    { key: "ospiti", header: "Ospiti" },
    { key: "prezzo", header: "€/pp", render: (r: CateringEvent) => `€${r.prezzoPersona.toFixed(2)}` },
    { key: "totale", header: "Totale", render: (r: CateringEvent) => <span className="font-semibold text-rw-ink">€{(r.ospiti * r.prezzoPersona).toFixed(2)}</span> },
    {
      key: "stato", header: "Stato",
      render: (r: CateringEvent) => {
        const tMap = { confermato: "bg-emerald-500/15 text-emerald-400", "in attesa": "bg-amber-500/15 text-amber-400", completato: "bg-blue-500/15 text-blue-400" } as const;
        return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", tMap[r.stato])}>{r.stato}</span>;
      },
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Catering" subtitle="Gestione menù preset, eventi e calcolatore costi">
        <Chip label="Preset" value={presets.length} tone="info" />
        <Chip label="Eventi" value={events.length} tone="accent" />
        <Chip label="Confermati" value={events.filter((e) => e.stato === "confermato").length} tone="success" />
      </PageHeader>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* ============================================================ */}
      {/*  TAB: Preset menù                                            */}
      {/* ============================================================ */}
      {tab === "preset" && (
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          {/* Left — Preset form */}
          <Card title="Nuovo preset" description="Crea un menù preimpostato riutilizzabile.">
            <div className="space-y-3">
              <div><label className={labelCls}>Nome preset</label><input className={inputCls} value={pNome} onChange={(e) => setPNome(e.target.value)} placeholder="Classico italiano" /></div>
              <div><label className={labelCls}>Descrizione</label><textarea className={cn(inputCls, "resize-y")} rows={2} value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="Breve descrizione…" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Prezzo/persona (€)</label><input type="number" step="0.01" className={inputCls} value={pPrezzo} onChange={(e) => setPPrezzo(e.target.value)} placeholder="55.00" /></div>
                <div><label className={labelCls}>Note</label><input className={inputCls} value={pNote} onChange={(e) => setPNote(e.target.value)} placeholder="Min. persone, vincoli…" /></div>
              </div>

              {/* Dynamic course sections */}
              <div className="space-y-3 border-t border-rw-line pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Portate</p>
                  <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-rw-accent hover:underline" onClick={addPortataSection}>
                    <Plus className="h-3.5 w-3.5" /> Aggiungi sezione
                  </button>
                </div>
                {pPortate.map((pt, pi) => (
                  <div key={pt.id} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input className={cn(inputCls, "flex-1 bg-rw-surface")} value={pt.nome} onChange={(e) => updatePortataNome(pi, e.target.value)} placeholder="Nome portata (es. Antipasti)" />
                      {pPortate.length > 1 && (
                        <button type="button" onClick={() => removePortataSection(pi)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10" title="Rimuovi sezione">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {pt.piatti.map((pl, pli) => (
                      <div key={pli} className="flex items-center gap-2 pl-3">
                        <span className="text-xs text-rw-muted">•</span>
                        <input className={cn(inputCls, "flex-1 bg-rw-surface py-2 text-xs")} value={pl} onChange={(e) => updatePiatto(pi, pli, e.target.value)} placeholder="Nome piatto" />
                        {pt.piatti.length > 1 && (
                          <button type="button" onClick={() => removePiatto(pi, pli)} className="rounded-lg p-1 text-rw-muted hover:text-red-400">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addPiattoToPortata(pi)} className="ml-3 inline-flex items-center gap-1 text-[11px] font-semibold text-rw-accent hover:underline">
                      <Plus className="h-3 w-3" /> Piatto
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" className={btnPrimary} onClick={handleSavePreset}>
                <Save className="h-4 w-4" /> Salva preset
              </button>
            </div>
          </Card>

          {/* Right — Presets list */}
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold text-rw-ink">Preset disponibili</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {presets.map((pr) => (
                <div key={pr.id} className="rounded-2xl border border-rw-line bg-rw-surface p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-base font-semibold text-rw-ink">{pr.nome}</p>
                      <p className="mt-0.5 text-xs text-rw-muted">{pr.descrizione}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-rw-accent/15 px-2.5 py-1 text-xs font-semibold text-rw-accent">
                      €{pr.prezzoPersona}/pp
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {pr.portate.map((pt) => (
                      <li key={pt.id} className="rounded-lg bg-rw-surfaceAlt px-3 py-1.5">
                        <p className="text-xs font-semibold text-rw-soft">{pt.nome}</p>
                        <p className="text-xs text-rw-muted">{pt.piatti.join(", ")}</p>
                      </li>
                    ))}
                  </ul>
                  {pr.note && <p className="text-[11px] text-rw-muted italic">{pr.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  TAB: Event builder                                          */}
      {/* ============================================================ */}
      {tab === "builder" && (
        <Card title="Nuovo evento" description="Configura un evento catering completo.">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={labelCls}>Titolo evento</label><input className={inputCls} value={bTitolo} onChange={(e) => setBTitolo(e.target.value)} placeholder="Cena aziendale…" /></div>
              <div><label className={labelCls}>Cliente</label><input className={inputCls} value={bCliente} onChange={(e) => setBCliente(e.target.value)} placeholder="Nome e cognome" /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className={labelCls}>Data</label><input type="date" className={inputCls} value={bData} onChange={(e) => setBData(e.target.value)} /></div>
              <div><label className={labelCls}>N° ospiti</label><input type="number" className={inputCls} value={bOspiti} onChange={(e) => setBOspiti(e.target.value)} placeholder="40" /></div>
              <div><label className={labelCls}>Prezzo/persona (€)</label><input type="number" step="0.01" className={inputCls} value={bPrezzo} onChange={(e) => setBPrezzo(e.target.value)} placeholder="55.00" /></div>
            </div>
            <div>
              <label className={labelCls}>Preset menù</label>
              <select className={inputCls} value={bPresetId} onChange={(e) => setBPresetId(e.target.value)}>
                <option value="">— Menù vuoto (personalizzato) —</option>
                {presets.map((pr) => <option key={pr.id} value={pr.id}>{pr.nome} — €{pr.prezzoPersona}/pp</option>)}
              </select>
            </div>
            {bPresetId && (
              <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
                <p className="text-xs font-semibold text-rw-muted mb-2">Anteprima preset</p>
                <ul className="space-y-1">
                  {presets.find((pr) => pr.id === bPresetId)?.portate.map((pt) => (
                    <li key={pt.id} className="flex items-start gap-2 text-xs">
                      <span className="font-semibold text-rw-soft">{pt.nome}:</span>
                      <span className="text-rw-muted">{pt.piatti.join(", ")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div><label className={labelCls}>Note</label><textarea className={cn(inputCls, "resize-y")} rows={2} value={bNote} onChange={(e) => setBNote(e.target.value)} placeholder="Location, esigenze speciali…" /></div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className={btnPrimary} onClick={handleSaveEvent}>
                <Save className="h-4 w-4" /> Salva evento
              </button>
              <button type="button" className={btnSecondary} onClick={() => { /* print stub */ }}>
                <Printer className="h-4 w-4" /> Stampa
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/*  TAB: Eventi                                                  */}
      {/* ============================================================ */}
      {tab === "eventi" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Chip label="Totale" value={events.length} />
            <Chip label="Confermati" value={events.filter((e) => e.stato === "confermato").length} tone="success" />
            <Chip label="In attesa" value={events.filter((e) => e.stato === "in attesa").length} tone="warn" />
            <Chip label="Completati" value={events.filter((e) => e.stato === "completato").length} tone="info" />
          </div>
          <DataTable columns={eventCols} data={events} keyExtractor={(r) => r.id} emptyMessage="Nessun evento registrato" />
        </div>
      )}

      {/* ============================================================ */}
      {/*  TAB: Calcolatore                                             */}
      {/* ============================================================ */}
      {tab === "calcolatore" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          {/* Main calculator area */}
          <div className="space-y-6">
            {/* People count */}
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

            {/* Course type buttons */}
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

            {/* Dynamic menu container */}
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

            {/* Extra costs */}
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

          {/* Right — Results summary */}
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
