"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  Clock,
  Edit,
  Plus,
  Send,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Ruolo = "sala" | "cucina" | "bar" | "pizzeria" | "cassa" | "supervisor";

type Dipendente = {
  id: string;
  nome: string;
  cognome: string;
  ruolo: Ruolo;
  telefono: string;
  email: string;
  dataAssunzione: string;
  tipoContratto: string;
  note: string;
  attivo: boolean;
  presenteOggi: boolean;
  oraEntrata?: string;
  oraUscita?: string;
  oreLavorate?: number;
};

type RichiestaAssenza = {
  id: string;
  dipendenteId: string;
  tipo: "ferie" | "malattia" | "permesso";
  dal: string;
  al: string;
  note: string;
  stato: "in attesa" | "approvata" | "rifiutata";
};

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const RUOLI: Ruolo[] = ["sala", "cucina", "bar", "pizzeria", "cassa", "supervisor"];

const mockStaff: Dipendente[] = [
  { id: "d1", nome: "Marco", cognome: "Bianchi", ruolo: "sala", telefono: "333-1111111", email: "marco@risto.it", dataAssunzione: "2022-03-15", tipoContratto: "Indeterminato", note: "", attivo: true, presenteOggi: true, oraEntrata: "09:00", oraUscita: "17:30", oreLavorate: 8.5 },
  { id: "d2", nome: "Giulia", cognome: "Rossi", ruolo: "cucina", telefono: "333-2222222", email: "giulia@risto.it", dataAssunzione: "2021-06-01", tipoContratto: "Indeterminato", note: "Chef di linea", attivo: true, presenteOggi: true, oraEntrata: "08:30", oraUscita: "16:30", oreLavorate: 8 },
  { id: "d3", nome: "Luca", cognome: "Verdi", ruolo: "bar", telefono: "333-3333333", email: "luca@risto.it", dataAssunzione: "2023-01-10", tipoContratto: "Determinato", note: "", attivo: true, presenteOggi: true, oraEntrata: "10:00", oraUscita: undefined, oreLavorate: undefined },
  { id: "d4", nome: "Francesca", cognome: "Neri", ruolo: "pizzeria", telefono: "333-4444444", email: "francesca@risto.it", dataAssunzione: "2020-09-20", tipoContratto: "Indeterminato", note: "Pizzaiola esperta", attivo: true, presenteOggi: false },
  { id: "d5", nome: "Alessandro", cognome: "Conti", ruolo: "cassa", telefono: "333-5555555", email: "alessandro@risto.it", dataAssunzione: "2023-05-12", tipoContratto: "Apprendistato", note: "", attivo: true, presenteOggi: true, oraEntrata: "11:00", oraUscita: undefined, oreLavorate: undefined },
  { id: "d6", nome: "Sara", cognome: "Moretti", ruolo: "supervisor", telefono: "333-6666666", email: "sara@risto.it", dataAssunzione: "2019-02-01", tipoContratto: "Indeterminato", note: "Responsabile sala", attivo: true, presenteOggi: true, oraEntrata: "08:00", oraUscita: "17:00", oreLavorate: 9 },
  { id: "d7", nome: "Davide", cognome: "Ferrari", ruolo: "cucina", telefono: "333-7777777", email: "davide@risto.it", dataAssunzione: "2024-01-15", tipoContratto: "Determinato", note: "", attivo: false, presenteOggi: false },
  { id: "d8", nome: "Elena", cognome: "Colombo", ruolo: "sala", telefono: "333-8888888", email: "elena@risto.it", dataAssunzione: "2023-11-01", tipoContratto: "Part-time", note: "", attivo: true, presenteOggi: false },
];

const mockAssenze: RichiestaAssenza[] = [
  { id: "a1", dipendenteId: "d4", tipo: "ferie", dal: "2026-04-15", al: "2026-04-22", note: "Vacanze pasquali", stato: "approvata" },
  { id: "a2", dipendenteId: "d7", tipo: "malattia", dal: "2026-04-10", al: "2026-04-14", note: "Influenza", stato: "in attesa" },
  { id: "a3", dipendenteId: "d8", tipo: "permesso", dal: "2026-04-11", al: "2026-04-11", note: "Visita medica", stato: "approvata" },
];

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function StaffPage() {
  const [staff, setStaff] = useState<Dipendente[]>(mockStaff);
  const [assenze, setAssenze] = useState<RichiestaAssenza[]>(mockAssenze);
  const [presenzeDate, setPresenzeDate] = useState("2026-04-11");

  // new-employee form
  const [fNome, setFNome] = useState("");
  const [fCognome, setFCognome] = useState("");
  const [fRuolo, setFRuolo] = useState<Ruolo>("sala");
  const [fTelefono, setFTelefono] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fDataAss, setFDataAss] = useState("");
  const [fContratto, setFContratto] = useState("");
  const [fNote, setFNote] = useState("");

  // absence-request form
  const [aDipId, setADipId] = useState("");
  const [aTipo, setATipo] = useState<"ferie" | "malattia" | "permesso">("ferie");
  const [aDal, setADal] = useState("");
  const [aAl, setAAl] = useState("");
  const [aNote, setANote] = useState("");

  // filter for absences
  const [assenzaFiltro, setAssenzaFiltro] = useState<"tutti" | "in attesa" | "approvata" | "rifiutata">("tutti");

  /* ---- derived KPIs ---- */
  const totale = staff.length;
  const attivi = staff.filter((s) => s.attivo).length;
  const presentiOggi = staff.filter((s) => s.presenteOggi).length;
  const turniAperti = staff.filter((s) => s.presenteOggi && !s.oraUscita).length;
  const anomalie = assenze.filter((a) => a.stato === "in attesa").length;
  const oreOggi = staff.reduce((acc, s) => acc + (s.oreLavorate ?? 0), 0);

  /* ---- handlers ---- */
  function handleAddDipendente() {
    if (!fNome.trim() || !fCognome.trim()) return;
    const id = `d${Date.now()}`;
    const nuovo: Dipendente = {
      id,
      nome: fNome.trim(),
      cognome: fCognome.trim(),
      ruolo: fRuolo,
      telefono: fTelefono,
      email: fEmail,
      dataAssunzione: fDataAss || new Date().toISOString().slice(0, 10),
      tipoContratto: fContratto || "Determinato",
      note: fNote,
      attivo: true,
      presenteOggi: false,
    };
    setStaff((p) => [...p, nuovo]);
    setFNome(""); setFCognome(""); setFRuolo("sala"); setFTelefono("");
    setFEmail(""); setFDataAss(""); setFContratto(""); setFNote("");
  }

  function handleAddAssenza() {
    if (!aDipId || !aDal) return;
    const id = `a${Date.now()}`;
    setAssenze((p) => [...p, { id, dipendenteId: aDipId, tipo: aTipo, dal: aDal, al: aAl || aDal, note: aNote, stato: "in attesa" }]);
    setADipId(""); setATipo("ferie"); setADal(""); setAAl(""); setANote("");
  }

  function toggleAttivo(id: string) {
    setStaff((p) => p.map((s) => (s.id === id ? { ...s, attivo: !s.attivo } : s)));
  }

  function getDipNome(id: string) {
    const d = staff.find((s) => s.id === id);
    return d ? `${d.nome} ${d.cognome}` : id;
  }

  /* ---- tables ---- */
  const staffCols = [
    { key: "nome", header: "Nome", render: (r: Dipendente) => <span className="font-medium text-rw-ink">{r.nome} {r.cognome}</span> },
    { key: "ruolo", header: "Ruolo", render: (r: Dipendente) => <span className="capitalize">{r.ruolo}</span> },
    {
      key: "attivo", header: "Stato",
      render: (r: Dipendente) => (
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", r.attivo ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")}>
          {r.attivo ? "Attivo" : "Inattivo"}
        </span>
      ),
    },
    {
      key: "presente", header: "Oggi",
      render: (r: Dipendente) => (
        <span className={cn("text-xs font-semibold", r.presenteOggi ? "text-emerald-400" : "text-rw-muted")}>
          {r.presenteOggi ? "Sì" : "No"}
        </span>
      ),
    },
    {
      key: "azioni", header: "Azioni",
      render: (r: Dipendente) => (
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-lg p-1.5 text-rw-muted hover:bg-rw-surfaceAlt hover:text-rw-ink" title="Modifica">
            <Edit className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => toggleAttivo(r.id)} className="rounded-lg p-1.5 text-rw-muted hover:bg-rw-surfaceAlt hover:text-rw-ink" title={r.attivo ? "Disattiva" : "Attiva"}>
            {r.attivo ? <ToggleRight className="h-4 w-4 text-emerald-400" /> : <ToggleLeft className="h-4 w-4" />}
          </button>
        </div>
      ),
    },
  ];

  const filteredAssenze = assenzaFiltro === "tutti" ? assenze : assenze.filter((a) => a.stato === assenzaFiltro);

  const assenzeCols = [
    { key: "dip", header: "Dipendente", render: (r: RichiestaAssenza) => <span className="font-medium text-rw-ink">{getDipNome(r.dipendenteId)}</span> },
    { key: "tipo", header: "Tipo", render: (r: RichiestaAssenza) => <span className="capitalize">{r.tipo}</span> },
    { key: "dal", header: "Dal" },
    { key: "al", header: "Al" },
    {
      key: "stato", header: "Stato",
      render: (r: RichiestaAssenza) => {
        const toneMap = { "in attesa": "bg-amber-500/15 text-amber-400", approvata: "bg-emerald-500/15 text-emerald-400", rifiutata: "bg-red-500/15 text-red-400" } as const;
        return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", toneMap[r.stato])}>{r.stato}</span>;
      },
    },
    { key: "note", header: "Note" },
  ];

  const presentiOggiList = staff.filter((s) => s.presenteOggi);
  const presenzeCols = [
    { key: "nome", header: "Nome", render: (r: Dipendente) => <span className="font-medium text-rw-ink">{r.nome} {r.cognome}</span> },
    { key: "entrata", header: "Entrata", render: (r: Dipendente) => r.oraEntrata ?? "—" },
    { key: "uscita", header: "Uscita", render: (r: Dipendente) => r.oraUscita ?? "—" },
    { key: "ore", header: "Ore", render: (r: Dipendente) => r.oreLavorate != null ? r.oreLavorate.toFixed(1) : "In corso" },
    {
      key: "stato", header: "Stato",
      render: (r: Dipendente) => (
        <span className={cn("text-xs font-semibold", r.oraUscita ? "text-rw-muted" : "text-emerald-400")}>
          {r.oraUscita ? "Completato" : "In turno"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header + KPIs */}
      <PageHeader title="Staff" subtitle="Gestione dipendenti, presenze e assenze">
        <Chip label="Totale" value={totale} tone="info" />
        <Chip label="Attivi" value={attivi} tone="success" />
        <Chip label="Presenti" value={presentiOggi} tone="accent" />
        <Chip label="Turni aperti" value={turniAperti} tone="warn" />
        <Chip label="Anomalie" value={anomalie} tone={anomalie > 0 ? "danger" : "default"} />
        <Chip label="Ore oggi" value={oreOggi.toFixed(1)} />
      </PageHeader>

      {/* Two-column layout */}
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        {/* LEFT — Forms */}
        <div className="space-y-6">
          {/* Add employee */}
          <Card title="Aggiungi dipendente" description="Compila i dati del nuovo membro dello staff.">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Nome</label><input className={inputCls} value={fNome} onChange={(e) => setFNome(e.target.value)} placeholder="Mario" /></div>
                <div><label className={labelCls}>Cognome</label><input className={inputCls} value={fCognome} onChange={(e) => setFCognome(e.target.value)} placeholder="Rossi" /></div>
              </div>
              <div>
                <label className={labelCls}>Ruolo</label>
                <select className={inputCls} value={fRuolo} onChange={(e) => setFRuolo(e.target.value as Ruolo)}>
                  {RUOLI.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Telefono</label><input className={inputCls} value={fTelefono} onChange={(e) => setFTelefono(e.target.value)} placeholder="333-…" /></div>
                <div><label className={labelCls}>Email</label><input className={inputCls} value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="email@…" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Data assunzione</label><input type="date" className={inputCls} value={fDataAss} onChange={(e) => setFDataAss(e.target.value)} /></div>
                <div><label className={labelCls}>Tipo contratto</label><input className={inputCls} value={fContratto} onChange={(e) => setFContratto(e.target.value)} placeholder="Indeterminato" /></div>
              </div>
              <div><label className={labelCls}>Note</label><textarea className={cn(inputCls, "resize-y")} rows={2} value={fNote} onChange={(e) => setFNote(e.target.value)} placeholder="Annotazioni…" /></div>
              <button type="button" className={btnPrimary} onClick={handleAddDipendente}>
                <UserPlus className="h-4 w-4" /> Salva
              </button>
            </div>
          </Card>

          {/* Absence request */}
          <Card title="Nuova richiesta assenza" description="Richiesta ferie, malattia o permesso.">
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Dipendente</label>
                <select className={inputCls} value={aDipId} onChange={(e) => setADipId(e.target.value)}>
                  <option value="">— Seleziona —</option>
                  {staff.filter((s) => s.attivo).map((s) => <option key={s.id} value={s.id}>{s.nome} {s.cognome}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Tipo</label>
                <select className={inputCls} value={aTipo} onChange={(e) => setATipo(e.target.value as typeof aTipo)}>
                  <option value="ferie">Ferie</option>
                  <option value="malattia">Malattia</option>
                  <option value="permesso">Permesso</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Dal</label><input type="date" className={inputCls} value={aDal} onChange={(e) => setADal(e.target.value)} /></div>
                <div><label className={labelCls}>Al</label><input type="date" className={inputCls} value={aAl} onChange={(e) => setAAl(e.target.value)} /></div>
              </div>
              <div><label className={labelCls}>Note</label><textarea className={cn(inputCls, "resize-y")} rows={2} value={aNote} onChange={(e) => setANote(e.target.value)} placeholder="Motivazione…" /></div>
              <button type="button" className={btnPrimary} onClick={handleAddAssenza}>
                <Send className="h-4 w-4" /> Invia
              </button>
            </div>
          </Card>
        </div>

        {/* RIGHT — Tables */}
        <div className="space-y-6">
          {/* Staff table */}
          <Card
            title="Elenco staff"
            description={`${totale} dipendenti registrati`}
            headerRight={
              <span className="inline-flex items-center gap-1.5 text-xs text-rw-muted">
                <Users className="h-4 w-4" /> {attivi} attivi
              </span>
            }
          >
            <DataTable columns={staffCols} data={staff} keyExtractor={(r) => r.id} emptyMessage="Nessun dipendente" />
          </Card>

          {/* Absence requests */}
          <Card
            title="Richieste assenze"
            headerRight={
              <div className="flex gap-1">
                {(["tutti", "in attesa", "approvata", "rifiutata"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setAssenzaFiltro(f)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition",
                      assenzaFiltro === f ? "bg-rw-accent/15 text-rw-accent" : "text-rw-muted hover:text-rw-soft",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            }
          >
            <DataTable columns={assenzeCols} data={filteredAssenze} keyExtractor={(r) => r.id} emptyMessage="Nessuna richiesta" />
          </Card>

          {/* Attendance today */}
          <Card
            title="Presenze oggi"
            headerRight={
              <div className="flex items-center gap-2">
                <input type="date" className={cn(inputCls, "w-auto py-1.5 text-xs")} value={presenzeDate} onChange={(e) => setPresenzeDate(e.target.value)} />
                <span className="inline-flex items-center gap-1.5 text-xs text-rw-muted">
                  <Clock className="h-3.5 w-3.5" /> {presentiOggiList.length} presenti
                </span>
              </div>
            }
          >
            <DataTable columns={presenzeCols} data={presentiOggiList} keyExtractor={(r) => r.id} emptyMessage="Nessuna presenza registrata" />
          </Card>
        </div>
      </div>
    </div>
  );
}
