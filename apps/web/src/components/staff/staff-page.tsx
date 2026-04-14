"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Edit,
  Loader2,
  Plus,
  Send,
  ToggleLeft,
  ToggleRight,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { staffApi, type StaffMember, type StaffShift } from "@/lib/api-client";

type RichiestaAssenza = {
  id: string;
  dipendenteId: string;
  tipo: "ferie" | "malattia" | "permesso";
  dal: string;
  al: string;
  note: string;
  stato: "in attesa" | "approvata" | "rifiutata";
};

const ROLES = ["sala", "cucina", "bar", "pizzeria", "cassa", "supervisor"];

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

export function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assenze, setAssenze] = useState<RichiestaAssenza[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);

  const [fName, setFName] = useState("");
  const [fRole, setFRole] = useState("sala");
  const [fPhone, setFPhone] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fHireDate, setFHireDate] = useState("");
  const [fSalary, setFSalary] = useState("");
  const [fHoursWeek, setFHoursWeek] = useState("");
  const [fNotes, setFNotes] = useState("");

  const [aDipId, setADipId] = useState("");
  const [aTipo, setATipo] = useState<"ferie" | "malattia" | "permesso">("ferie");
  const [aDal, setADal] = useState("");
  const [aAl, setAAl] = useState("");
  const [aNote, setANote] = useState("");

  const [assenzaFiltro, setAssenzaFiltro] = useState<"tutti" | "in attesa" | "approvata" | "rifiutata">("tutti");

  useEffect(() => {
    staffApi
      .list()
      .then(async (staffRows) => {
        setStaff(staffRows);
        const shiftRows = await staffApi.listShifts();
        setShifts(shiftRows);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totale = staff.length;
  const attivi = staff.filter((s) => s.status === "attivo").length;
  const inFerie = staff.filter((s) => s.status === "ferie").length;
  const inMalattia = staff.filter((s) => s.status === "malattia").length;
  const anomalie = assenze.filter((a) => a.stato === "in attesa").length;
  const oreTotali = staff.reduce((acc, s) => acc + s.hoursWeek, 0);

  async function handleAddDipendente() {
    if (!fName.trim()) return;
    try {
      const created = await staffApi.create({
        name: fName.trim(),
        role: fRole,
        phone: fPhone,
        email: fEmail,
        hireDate: fHireDate || new Date().toISOString().slice(0, 10),
        salary: Number(fSalary) || 0,
        hoursWeek: Number(fHoursWeek) || 40,
        status: "attivo",
        notes: fNotes,
      });
      setStaff((p) => [...p, created]);
      setFName(""); setFRole("sala"); setFPhone("");
      setFEmail(""); setFHireDate(""); setFSalary(""); setFHoursWeek(""); setFNotes("");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Errore nel salvataggio");
    }
  }

  function handleAddAssenza() {
    if (!aDipId || !aDal) return;
    const id = `a${Date.now()}`;
    setAssenze((p) => [...p, { id, dipendenteId: aDipId, tipo: aTipo, dal: aDal, al: aAl || aDal, note: aNote, stato: "in attesa" }]);
    setADipId(""); setATipo("ferie"); setADal(""); setAAl(""); setANote("");
  }

  async function toggleAttivo(member: StaffMember) {
    const newStatus = member.status === "attivo" ? "licenziato" : "attivo";
    try {
      const updated = await staffApi.update(member.id, { status: newStatus });
      setStaff((p) => p.map((s) => (s.id === member.id ? updated : s)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Errore nell'aggiornamento");
    }
  }

  async function clock(staffId: string, action: "clock_in" | "clock_out") {
    try {
      const updated = await staffApi.clock(staffId, action);
      setShifts((prev) => {
        const idx = prev.findIndex((row) => row.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [updated, ...prev];
      });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Errore timbratura");
    }
  }

  function getDipNome(id: string) {
    const d = staff.find((s) => s.id === id);
    return d ? d.name : id;
  }

  const staffCols = [
    { key: "name", header: "Nome", render: (r: StaffMember) => <span className="font-medium text-rw-ink">{r.name}</span> },
    { key: "role", header: "Ruolo", render: (r: StaffMember) => <span className="capitalize">{r.role}</span> },
    {
      key: "status", header: "Stato",
      render: (r: StaffMember) => {
        const toneMap: Record<string, string> = {
          attivo: "bg-emerald-500/15 text-emerald-400",
          ferie: "bg-amber-500/15 text-amber-400",
          malattia: "bg-blue-500/15 text-blue-400",
          licenziato: "bg-red-500/15 text-red-400",
        };
        return (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", toneMap[r.status] ?? "text-rw-muted")}>
            {r.status}
          </span>
        );
      },
    },
    {
      key: "hoursWeek", header: "Ore/sett.",
      render: (r: StaffMember) => <span className="text-xs text-rw-soft">{r.hoursWeek}h</span>,
    },
    {
      key: "azioni", header: "Azioni",
      render: (r: StaffMember) => (
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-lg p-1.5 text-rw-muted hover:bg-rw-surfaceAlt hover:text-rw-ink" title="Modifica">
            <Edit className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => toggleAttivo(r)} className="rounded-lg p-1.5 text-rw-muted hover:bg-rw-surfaceAlt hover:text-rw-ink" title={r.status === "attivo" ? "Disattiva" : "Attiva"}>
            {r.status === "attivo" ? <ToggleRight className="h-4 w-4 text-emerald-400" /> : <ToggleLeft className="h-4 w-4" />}
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

  const staffPerRole = ROLES.map((role) => ({
    role,
    count: staff.filter((s) => s.role === role && s.status === "attivo").length,
  }));

  const roleCols = [
    { key: "role", header: "Ruolo", render: (r: { role: string; count: number }) => <span className="font-medium capitalize text-rw-ink">{r.role}</span> },
    { key: "count", header: "Attivi", render: (r: { role: string; count: number }) => <span className="text-rw-soft">{r.count}</span> },
  ];

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
    <div className="space-y-8">
      <PageHeader title="Staff" subtitle="Gestione dipendenti, presenze e assenze">
        <Chip label="Totale" value={totale} tone="info" />
        <Chip label="Attivi" value={attivi} tone="success" />
        <Chip label="In ferie" value={inFerie} tone="accent" />
        <Chip label="Malattia" value={inMalattia} tone="warn" />
        <Chip label="Anomalie" value={anomalie} tone={anomalie > 0 ? "danger" : "default"} />
        <Chip label="Ore/sett." value={oreTotali} />
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <Card title="Aggiungi dipendente" description="Compila i dati del nuovo membro dello staff.">
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Nome completo</label>
                <input className={inputCls} value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Mario Rossi" />
              </div>
              <div>
                <label className={labelCls}>Ruolo</label>
                <select className={inputCls} value={fRole} onChange={(e) => setFRole(e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Telefono</label><input className={inputCls} value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="333-…" /></div>
                <div><label className={labelCls}>Email</label><input className={inputCls} value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="email@…" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Data assunzione</label><input type="date" className={inputCls} value={fHireDate} onChange={(e) => setFHireDate(e.target.value)} /></div>
                <div><label className={labelCls}>Stipendio (€)</label><input type="number" className={inputCls} value={fSalary} onChange={(e) => setFSalary(e.target.value)} placeholder="1500" /></div>
              </div>
              <div>
                <label className={labelCls}>Ore/settimana</label>
                <input type="number" className={inputCls} value={fHoursWeek} onChange={(e) => setFHoursWeek(e.target.value)} placeholder="40" />
              </div>
              <div><label className={labelCls}>Note</label><textarea className={cn(inputCls, "resize-y")} rows={2} value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="Annotazioni…" /></div>
              <button type="button" className={btnPrimary} onClick={handleAddDipendente}>
                <UserPlus className="h-4 w-4" /> Salva
              </button>
            </div>
          </Card>

          <Card title="Nuova richiesta assenza" description="Richiesta ferie, malattia o permesso.">
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Dipendente</label>
                <select className={inputCls} value={aDipId} onChange={(e) => setADipId(e.target.value)}>
                  <option value="">— Seleziona —</option>
                  {staff.filter((s) => s.status === "attivo").map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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

        <div className="space-y-6">
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

          <Card title="Timbrature reali" description="Login/logout personale persistente su DB.">
            <DataTable
              columns={[
                {
                  key: "staff",
                  header: "Staff",
                  render: (row: StaffMember) => <span className="font-medium text-rw-ink">{row.name}</span>,
                },
                {
                  key: "shift",
                  header: "Stato turno",
                  render: (row: StaffMember) => {
                    const open = shifts.find((s) => s.staffId === row.id && s.clockOutAt == null);
                    return (
                      <span className={cn("text-xs font-semibold", open ? "text-emerald-400" : "text-rw-muted")}>
                        {open ? `In turno dalle ${new Date(open.clockInAt).toLocaleTimeString()}` : "Fuori turno"}
                      </span>
                    );
                  },
                },
                {
                  key: "hours",
                  header: "Ore oggi",
                  render: (row: StaffMember) => {
                    const today = new Date().toISOString().slice(0, 10);
                    const worked = shifts
                      .filter((s) => s.staffId === row.id && s.clockInAt.slice(0, 10) === today)
                      .reduce((sum, s) => sum + (s.durationHours ?? 0), 0);
                    return <span className="text-rw-soft">{worked.toFixed(2)}h</span>;
                  },
                },
                {
                  key: "actionsClock",
                  header: "Azioni",
                  render: (row: StaffMember) => {
                    const open = shifts.find((s) => s.staffId === row.id && s.clockOutAt == null);
                    return (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className={cn("rounded-lg px-2 py-1 text-xs font-semibold", "bg-emerald-500/15 text-emerald-400")}
                          onClick={() => clock(row.id, "clock_in")}
                          disabled={!!open}
                        >
                          Login
                        </button>
                        <button
                          type="button"
                          className={cn("rounded-lg px-2 py-1 text-xs font-semibold", "bg-red-500/15 text-red-400")}
                          onClick={() => clock(row.id, "clock_out")}
                          disabled={!open}
                        >
                          Logout
                        </button>
                      </div>
                    );
                  },
                },
              ]}
              data={staff}
              keyExtractor={(row) => row.id}
              emptyMessage="Nessun dipendente disponibile"
            />
          </Card>

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

          <Card
            title="Staff per ruolo"
            headerRight={
              <span className="inline-flex items-center gap-1.5 text-xs text-rw-muted">
                <Clock className="h-3.5 w-3.5" /> {oreTotali} ore/sett. totali
              </span>
            }
          >
            <DataTable columns={roleCols} data={staffPerRole} keyExtractor={(r) => r.role} emptyMessage="Nessun ruolo" />
          </Card>
        </div>
      </div>
    </div>
  );
}
