"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Edit,
  ExternalLink,
  KeyRound,
  Loader2,
  Plus,
  QrCode,
  Send,
  Trash2,
  ToggleLeft,
  ToggleRight,
  UserPlus,
  Users,
} from "lucide-react";
import { cn, qrImageUrl } from "@/lib/utils";
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

// Ruoli operativi (job title nel record staff — visibili nella lista dipendenti)
const STAFF_JOB_ROLES = [
  // Cucina
  { value: "chef",            label: "Chef",             group: "Cucina" },
  { value: "sous_chef",       label: "Sous Chef",        group: "Cucina" },
  { value: "capopartita",     label: "Capopartita",      group: "Cucina" },
  { value: "demi_chef",       label: "Demi Chef",        group: "Cucina" },
  { value: "comis_cucina",    label: "Comis di Cucina",  group: "Cucina" },
  { value: "lavapiatti",      label: "Lavapiatti",       group: "Cucina" },
  { value: "inserviente",     label: "Inserviente",      group: "Cucina" },
  // Sala
  { value: "maitre",          label: "Maître",           group: "Sala" },
  { value: "chef_de_rang",    label: "Chef de Rang",     group: "Sala" },
  { value: "demi_chef_sala",  label: "Demi Chef di Sala",group: "Sala" },
  { value: "comis_sala",      label: "Comis di Sala",    group: "Sala" },
  // Bar
  { value: "barman",          label: "Barman",           group: "Bar" },
  { value: "bartender",       label: "Bartender",        group: "Bar" },
  { value: "comis_bar",       label: "Comis di Bar",     group: "Bar" },
  // Pizzeria
  { value: "capo_pizzaiolo",  label: "Capo Pizzaiolo",   group: "Pizzeria" },
  { value: "pizzaiolo",       label: "Pizzaiolo",        group: "Pizzeria" },
  { value: "comis_pizzeria",  label: "Comis di Pizzeria",group: "Pizzeria" },
  // Cassa
  { value: "cassiere",        label: "Cassiere",         group: "Cassa" },
  // Hotel
  { value: "receptionist",    label: "Receptionist",     group: "Hotel" },
  { value: "concierge",       label: "Concierge",        group: "Hotel" },
  { value: "housekeeping",    label: "Housekeeping",     group: "Hotel" },
  // Gestione
  { value: "supervisor",      label: "Supervisor",       group: "Gestione" },
  { value: "responsabile",    label: "Responsabile",     group: "Gestione" },
  // Magazzino
  { value: "magazziniere",    label: "Magazziniere",     group: "Magazzino" },
  // Altro
  { value: "cameriere",       label: "Cameriere",        group: "Sala" },
  { value: "staff",           label: "Staff",            group: "Altro" },
];

// Ruoli di accesso (permessi di sistema — usati per il login e i permessi API)
const USER_ACCESS_ROLES = [
  { value: "sala",           label: "Sala (camerieri, chef de rang…)",  },
  { value: "cucina",         label: "Cucina (chef, sous chef, comis…)",  },
  { value: "bar",            label: "Bar (barman, bartender…)",          },
  { value: "pizzeria",       label: "Pizzeria (pizzaiolo…)",             },
  { value: "cassa",          label: "Cassa",                            },
  { value: "magazzino",      label: "Magazzino",                        },
  { value: "supervisor",     label: "Supervisor",                       },
  { value: "reception",      label: "Reception (hotel)",                },
  { value: "hotel_manager",  label: "Hotel Manager",                    },
  { value: "housekeeping",   label: "Housekeeping (hotel)",             },
  { value: "staff",          label: "Staff (base, solo timbratura)",    },
];

// Alias per retrocompatibilità nel form staff member
const ROLES = STAFF_JOB_ROLES.map((r) => r.value);

type TenantUser = {
  id: string;
  name: string;
  username: string;
  role: string;
  email?: string | null;
  mustChangePassword?: boolean;
  isLocked?: boolean;
};

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

function StaffBadgesCard({ staff, appOrigin }: { staff: StaffMember[]; appOrigin: string }) {
  const [tokens, setTokens] = useState<Array<{ id: string; name: string; role: string; token: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [badgeError, setBadgeError] = useState<string | null>(null);

  async function generate() {
    if (staff.length === 0) return;
    setLoading(true);
    setBadgeError(null);
    try {
      const res = await fetch("/api/staff/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffIds: staff.map((s) => s.id) }),
      });
      const data = await res.json();
      setTokens(data.tokens ?? []);
      setGenerated(true);
    } catch (e) { setBadgeError(e instanceof Error ? e.message : "Errore generazione badge"); }
    finally { setLoading(false); }
  }

  const base = appOrigin || "";
  const clockUrl = `${base}/clock`;
  const nfcQrImg = clockUrl ? qrImageUrl(clockUrl, 160, 8) : "";

  return (
    <Card title="Badge QR & NFC" description="Genera i QR da stampare sui cartellini e il codice NFC per l'ingresso">
      <div className="space-y-5">
        {/* NFC Tag section */}
        <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-rw-line bg-white p-1.5">
              {nfcQrImg
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={nfcQrImg} alt="QR NFC ingresso" className="h-full w-full" />
                : <QrCode className="h-10 w-10 text-gray-300" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-rw-ink text-sm">🏷️ Etichetta NFC all&apos;ingresso</p>
              <p className="text-xs text-rw-muted mt-1">
                Programma un&apos;etichetta NFC con l&apos;URL: <span className="font-mono text-rw-accent break-all">{clockUrl}</span>
              </p>
              <p className="text-xs text-rw-muted mt-1">
                Oppure stampa questo QR e posizionalo all&apos;ingresso. Il dipendente tocca l&apos;etichetta o inquadra il QR con il suo telefono (già loggato nell&apos;app).
              </p>
              <div className="flex gap-2 mt-3">
                <a href={clockUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rw-line bg-rw-surface px-3 py-1.5 text-xs font-semibold text-rw-ink hover:border-rw-accent/40 transition">
                  <ExternalLink className="h-3.5 w-3.5" /> Anteprima pagina
                </a>
                <button type="button" onClick={async () => { await navigator.clipboard.writeText(clockUrl); }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rw-line bg-rw-surface px-3 py-1.5 text-xs font-semibold text-rw-muted hover:text-rw-ink transition">
                  Copia URL NFC
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Individual QR badges */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-rw-ink">QR Badge individuali</p>
              <p className="text-xs text-rw-muted">Un QR unico per ogni dipendente — funziona anche senza login</p>
            </div>
            <button type="button" onClick={() => void generate()} disabled={loading || staff.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2 text-sm font-semibold text-white hover:bg-rw-accent/90 disabled:opacity-50 transition">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              {generated ? "Rigenera" : "Genera badge"}
            </button>
          </div>

          {generated && tokens.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {tokens.map((t) => {
                const badgeUrl = `${base}/clock/badge/${t.token}`;
                const qrImg = qrImageUrl(badgeUrl, 140, 6);
                return (
                  <div key={t.id} className="flex flex-col items-center gap-2 rounded-2xl border border-rw-line bg-rw-surface p-3 text-center print:break-inside-avoid">
                    <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-rw-line bg-white p-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrImg} alt={`Badge ${t.name}`} className="h-full w-full" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-rw-ink leading-tight">{t.name}</p>
                      <p className="text-xs text-rw-muted capitalize">{t.role}</p>
                    </div>
                    <a href={badgeUrl} target="_blank" rel="noreferrer"
                      className="text-[10px] text-rw-accent hover:underline">
                      Testa badge
                    </a>
                  </div>
                );
              })}
            </div>
          )}

          {generated && tokens.length > 0 && (
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-4 py-2 text-sm font-medium text-rw-muted hover:bg-rw-surfaceAlt hover:text-rw-ink transition">
                🖨️ Stampa tutti i badge
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

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
  const [fUserId, setFUserId] = useState<string>("");
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);

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
    // Load tenant users for linking (best-effort)
    fetch("/api/users").then((r) => r.ok ? r.json() : []).then(setTenantUsers).catch(() => {});
  }, []);

  const totale = staff.length;
  const attivi = staff.filter((s) => s.status === "attivo").length;
  const inFerie = staff.filter((s) => s.status === "ferie").length;
  const inMalattia = staff.filter((s) => s.status === "malattia").length;
  const anomalie = assenze.filter((a) => a.stato === "in attesa").length;
  const oreTotali = staff.reduce((acc, s) => acc + s.hoursWeek, 0);

  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  function resetForm() {
    setFName(""); setFRole("sala"); setFPhone("");
    setFEmail(""); setFHireDate(""); setFSalary(""); setFHoursWeek(""); setFNotes("");
    setFUserId(""); setEditingStaffId(null);
  }

  async function handleLinkUser() {
    if (!editingStaffId || !fUserId) return;
    setLinkLoading(true);
    try {
      await fetch("/api/staff/me/link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: editingStaffId, userId: fUserId }),
      });
      const updated = await staffApi.list();
      setStaff(updated);
    } catch (e) { setError(e instanceof Error ? e.message : "Errore collegamento utente"); }
    finally { setLinkLoading(false); }
  }

  function handleEditStaff(member: StaffMember) {
    setEditingStaffId(member.id);
    setFName(member.name);
    setFRole(member.role);
    setFPhone(member.phone);
    setFEmail(member.email);
    setFHireDate(member.hireDate);
    setFSalary(String(member.salary));
    setFHoursWeek(String(member.hoursWeek));
    setFNotes(member.notes);
    setFUserId(member.userId ?? "");
    if (typeof document !== "undefined") {
      document.querySelector<HTMLInputElement>('input[placeholder="Mario Rossi"]')?.focus();
      document.querySelector('input[placeholder="Mario Rossi"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  async function handleAddDipendente() {
    if (!fName.trim()) return;
    try {
      if (editingStaffId) {
        const updated = await staffApi.update(editingStaffId, {
          name: fName.trim(),
          role: fRole,
          phone: fPhone,
          email: fEmail,
          hireDate: fHireDate || new Date().toISOString().slice(0, 10),
          salary: Number(fSalary) || 0,
          hoursWeek: Number(fHoursWeek) || 40,
          notes: fNotes,
        });
        setStaff((p) => p.map((s) => (s.id === editingStaffId ? updated : s)));
        resetForm();
        return;
      }
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
      resetForm();
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
    { key: "name", header: "Nome", render: (r: StaffMember) => (
      <div>
        <span className="font-medium text-rw-ink">{r.name}</span>
        {r.userId && <span className="ml-2 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">🔗</span>}
      </div>
    )},
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
          <button type="button" onClick={() => handleEditStaff(r)} className="rounded-lg p-1.5 text-rw-muted hover:bg-rw-surfaceAlt hover:text-rw-ink" title="Modifica">
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
          <Card
            title={editingStaffId ? "Modifica dipendente" : "Aggiungi dipendente"}
            description={editingStaffId ? "Aggiorna i dati del dipendente selezionato." : "Compila i dati del nuovo membro dello staff."}
            headerRight={
              editingStaffId ? (
                <button type="button" onClick={resetForm} className="text-xs font-semibold text-rw-muted hover:text-rw-accent">
                  Annulla modifica
                </button>
              ) : undefined
            }
          >
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Nome completo</label>
                <input className={inputCls} value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Mario Rossi" />
              </div>
              <div>
                <label className={labelCls}>Qualifica / Ruolo operativo</label>
                <div className="relative">
                  <select
                    className={cn(inputCls, "appearance-none cursor-pointer pr-9")}
                    value={fRole}
                    onChange={(e) => setFRole(e.target.value)}
                  >
                    {/* Fallback: mostra il valore corrente anche se non è nella lista (es. dati legacy) */}
                    {!ROLES.includes(fRole) && fRole && (
                      <option value={fRole}>{fRole}</option>
                    )}
                    {(() => {
                      const groups = [...new Set(STAFF_JOB_ROLES.map((r) => r.group))];
                      return groups.map((group) => (
                        <optgroup key={group} label={group}>
                          {STAFF_JOB_ROLES.filter((r) => r.group === group).map((r) => (
                            <option key={r.value} value={r.value} className="bg-rw-surface text-rw-ink">
                              {r.label}
                            </option>
                          ))}
                        </optgroup>
                      ));
                    })()}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                </div>
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

              {editingStaffId && tenantUsers.length > 0 && (
                <div className="rounded-xl border border-rw-line/60 bg-rw-surfaceAlt/50 p-3 space-y-2">
                  <label className={labelCls}>Collega account utente</label>
                  <p className="text-[11px] text-rw-muted">Associa un account di accesso a questo dipendente per il profilo personale.</p>
                  <div className="flex gap-2">
                    <select className={cn(inputCls, "flex-1")} value={fUserId} onChange={(e) => setFUserId(e.target.value)}>
                      <option value="">— Nessun account collegato —</option>
                      {tenantUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} (@{u.username}) [{u.role}]</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => void handleLinkUser()} disabled={linkLoading || !fUserId}
                      className="shrink-0 rounded-xl bg-rw-accent/15 px-3 py-2 text-xs font-semibold text-rw-accent hover:bg-rw-accent/25 disabled:opacity-50 transition">
                      {linkLoading ? "…" : "Collega"}
                    </button>
                  </div>
                </div>
              )}

              <button type="button" className={btnPrimary} onClick={handleAddDipendente}>
                <UserPlus className="h-4 w-4" /> {editingStaffId ? "Salva modifiche" : "Salva"}
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

          <StaffBadgesCard staff={staff} appOrigin={typeof window !== "undefined" ? window.location.origin : ""} />

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

          <AccessiStaffCard tenantUsers={tenantUsers} onUsersChange={setTenantUsers} />
        </div>
      </div>
    </div>
  );
}

/* ─── Componente Gestione Accessi ─────────────────────────────────── */

function AccessiStaffCard({
  tenantUsers,
  onUsersChange,
}: {
  tenantUsers: TenantUser[];
  onUsersChange: (users: TenantUser[]) => void;
}) {
  const [uName, setUName] = useState("");
  const [uUsername, setUUsername] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uRole, setURole] = useState("sala");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  const inputCls =
    "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";
  const labelCls = "block text-xs font-semibold text-rw-muted mb-1";

  async function handleCreate() {
    if (!uName.trim() || !uUsername.trim() || !uPassword.trim()) return;
    setSaving(true);
    setSaveError(null);
    setSaveOk(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: uName.trim(), username: uUsername.trim(), email: uEmail.trim() || undefined, password: uPassword, role: uRole }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error || "Errore nella creazione"); return; }
      setSaveOk(`Account "${uUsername}" creato. Al primo login dovrà cambiare la password.`);
      setUName(""); setUUsername(""); setUEmail(""); setUPassword(""); setURole("sala");
      // Ricarica lista utenti
      const updated = await fetch("/api/users").then((r) => r.ok ? r.json() : tenantUsers);
      onUsersChange(updated);
    } catch {
      setSaveError("Errore di rete");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: string, username: string) {
    if (!confirm(`Eliminare l'account "${username}"? L'utente non potrà più accedere.`)) return;
    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); alert(d.error || "Errore eliminazione"); return; }
      onUsersChange(tenantUsers.filter((u) => u.id !== userId));
    } catch { alert("Errore di rete"); }
  }

  return (
    <Card
      title="Accessi Staff"
      description="Crea username e password per ogni membro dello staff. Al primo accesso dovranno cambiare la password."
    >
      <div className="space-y-5">
        {/* Form creazione */}
        <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt/40 p-4 space-y-3">
          <p className="text-xs font-semibold text-rw-muted uppercase tracking-wide">Nuovo accesso</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nome completo</label>
              <input className={inputCls} value={uName} onChange={(e) => setUName(e.target.value)} placeholder="Mario Rossi" />
            </div>
            <div>
              <label className={labelCls}>Username (per il login)</label>
              <input className={inputCls} value={uUsername} onChange={(e) => setUUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))} placeholder="mario.rossi" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Password temporanea</label>
              <input type="text" className={inputCls} value={uPassword} onChange={(e) => setUPassword(e.target.value)} placeholder="min 6 caratteri" />
            </div>
            <div>
              <label className={labelCls}>Ruolo</label>
              <div className="relative">
                <select className={cn(inputCls, "appearance-none cursor-pointer pr-9")} value={uRole} onChange={(e) => setURole(e.target.value)}>
                  {USER_ACCESS_ROLES.map((r) => (
                    <option key={r.value} value={r.value} className="bg-rw-surface text-rw-ink">{r.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
              </div>
            </div>
          </div>
          <div>
            <label className={labelCls}>Email (opzionale)</label>
            <input type="email" className={inputCls} value={uEmail} onChange={(e) => setUEmail(e.target.value)} placeholder="mario@email.it" />
          </div>
          {saveError && <p className="text-xs font-semibold text-red-400">{saveError}</p>}
          {saveOk && <p className="text-xs font-semibold text-emerald-400">{saveOk}</p>}
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={saving || !uName.trim() || !uUsername.trim() || !uPassword.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-rw-accent/90 disabled:opacity-50 transition"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Crea accesso
          </button>
        </div>

        {/* Lista utenti esistenti */}
        {tenantUsers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-rw-muted uppercase tracking-wide">Account attivi ({tenantUsers.length})</p>
            {tenantUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-xl border border-rw-line bg-rw-surface px-4 py-3 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-rw-ink truncate">{u.name}</span>
                    {u.mustChangePassword && (
                      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">cambio pwd</span>
                    )}
                    {u.isLocked && (
                      <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">bloccato</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-rw-muted font-mono">@{u.username}</span>
                    <span className="text-rw-line">·</span>
                    <span className="text-xs text-rw-soft capitalize">{u.role.replace(/_/g, " ")}</span>
                    {u.email && <><span className="text-rw-line">·</span><span className="text-xs text-rw-muted">{u.email}</span></>}
                  </div>
                </div>
                {u.role !== "owner" && u.role !== "super_admin" && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(u.id, u.username)}
                    className="shrink-0 rounded-lg p-1.5 text-rw-muted hover:bg-red-500/10 hover:text-red-400 transition"
                    title="Elimina account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
