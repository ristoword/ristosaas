"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Edit,
  ExternalLink,
  Loader2,
  LogIn,
  LogOut,
  Plus,
  QrCode,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { staffApi, type StaffMember, type StaffShift } from "@/lib/api-client";

/* ─── Hotel roles ─────────────────────────────────── */

export const HOTEL_ROLES = [
  "reception",
  "housekeeping",
  "front_office",
  "receptionist",
  "concierge",
  "portiere_notte",
  "bellboy",
  "supervisor_piani",
  "manutentore",
  "autista",
  "sicurezza",
  "direttore",
  "vice_direttore",
  "amministrazione",
  "revenue_manager",
] as const;

export type HotelRole = (typeof HOTEL_ROLES)[number];

const HOTEL_ROLE_LABELS: Record<HotelRole, string> = {
  reception: "Reception",
  housekeeping: "Housekeeping",
  front_office: "Front Office",
  receptionist: "Receptionist",
  concierge: "Concierge",
  portiere_notte: "Portiere di Notte",
  bellboy: "Bellboy",
  supervisor_piani: "Supervisor Piani",
  manutentore: "Manutentore",
  autista: "Autista",
  sicurezza: "Sicurezza",
  direttore: "Direttore",
  vice_direttore: "Vice Direttore",
  amministrazione: "Amministrazione",
  revenue_manager: "Revenue Manager",
};

export function isHotelRole(role: string): role is HotelRole {
  return (HOTEL_ROLES as readonly string[]).includes(role);
}

export function hotelRoleLabel(role: string) {
  return HOTEL_ROLE_LABELS[role as HotelRole] ?? role;
}

/* ─── styles ─────────────────────────────────────── */

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";
const btnGhost =
  "inline-flex items-center gap-2 rounded-xl border border-rw-line px-3 py-2 text-xs font-medium text-rw-muted hover:text-rw-ink hover:bg-rw-surfaceAlt transition";

/* ─── Component ──────────────────────────────────── */

function HotelBadgesCard({ staff }: { staff: StaffMember[] }) {
  const [tokens, setTokens] = useState<Array<{ id: string; name: string; role: string; token: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [appOrigin, setAppOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setAppOrigin(window.location.origin);
  }, []);

  async function generate() {
    if (staff.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/staff/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffIds: staff.map((s) => s.id) }),
      });
      const data = await res.json();
      setTokens(data.tokens ?? []);
      setGenerated(true);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const clockUrl = `${appOrigin}/clock`;
  const nfcQrImg = appOrigin ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(clockUrl)}` : "";

  return (
    <Card title="Badge QR & NFC Hotel" description="Sistema timbratura per il personale alberghiero — stesso tag NFC del ristorante">
      <div className="space-y-5">
        {/* NFC Tag */}
        <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-rw-line bg-white p-1.5">
              {nfcQrImg
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={nfcQrImg} alt="NFC hotel" className="h-full w-full" />
                : <QrCode className="h-10 w-10 text-gray-300" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-rw-ink text-sm">🏷️ Tag NFC ingresso hotel</p>
              <p className="text-xs text-rw-muted mt-1">
                Stesso tag del ristorante — URL: <span className="font-mono text-rw-accent break-all">{clockUrl}</span>
              </p>
              <p className="text-xs text-rw-muted mt-1">
                Il dipendente avvicina il telefono (già loggato nell&apos;app) → timbra automaticamente.
              </p>
              <div className="flex gap-2 mt-3">
                <a href={clockUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rw-line bg-rw-surface px-3 py-1.5 text-xs font-semibold text-rw-ink hover:border-rw-accent/40 transition">
                  <ExternalLink className="h-3.5 w-3.5" /> Anteprima
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
              <p className="text-xs text-rw-muted">Un QR per ogni dipendente hotel — funziona senza login su tablet fisso</p>
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
                const badgeUrl = `${appOrigin}/clock/badge/${t.token}`;
                const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=6&data=${encodeURIComponent(badgeUrl)}`;
                return (
                  <div key={t.id} className="flex flex-col items-center gap-2 rounded-2xl border border-rw-line bg-rw-surface p-3 text-center">
                    <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-rw-line bg-white p-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrImg} alt={`Badge ${t.name}`} className="h-full w-full" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-rw-ink leading-tight">{t.name}</p>
                      <p className="text-xs text-rw-muted">{hotelRoleLabel(t.role)}</p>
                    </div>
                    <a href={badgeUrl} target="_blank" rel="noreferrer" className="text-[10px] text-rw-accent hover:underline">Testa badge</a>
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

export function HotelStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const [fName, setFName] = useState("");
  const [fRole, setFRole] = useState<HotelRole>("reception");
  const [fPhone, setFPhone] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fHireDate, setFHireDate] = useState("");
  const [fSalary, setFSalary] = useState("");
  const [fHoursWeek, setFHoursWeek] = useState("40");
  const [fNotes, setFNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const hotelStaff = staff.filter((s) => isHotelRole(s.role));

  useEffect(() => {
    staffApi
      .list()
      .then(async (rows) => {
        setStaff(rows);
        const shiftRows = await staffApi.listShifts();
        setShifts(shiftRows);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totale = hotelStaff.length;
  const attivi = hotelStaff.filter((s) => s.status === "attivo").length;
  const inFerie = hotelStaff.filter((s) => s.status === "ferie").length;
  const inMalattia = hotelStaff.filter((s) => s.status === "malattia").length;

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function openEdit(member: StaffMember) {
    setEditId(member.id);
    setFName(member.name);
    setFRole(member.role as HotelRole);
    setFPhone(member.phone ?? "");
    setFEmail(member.email ?? "");
    setFHireDate(member.hireDate?.slice(0, 10) ?? "");
    setFSalary(String(member.salary ?? ""));
    setFHoursWeek(String(member.hoursWeek ?? 40));
    setFNotes(member.notes ?? "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditId(null);
    setFName(""); setFRole("reception"); setFPhone(""); setFEmail("");
    setFHireDate(""); setFSalary(""); setFHoursWeek("40"); setFNotes("");
    setShowForm(false);
  }

  async function handleSave() {
    if (!fName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: fName.trim(),
        role: fRole,
        phone: fPhone.trim(),
        email: fEmail.trim(),
        hireDate: fHireDate || today(),
        salary: Number(fSalary) || 0,
        status: "attivo" as const,
        hoursWeek: Number(fHoursWeek) || 40,
        notes: fNotes.trim(),
      };
      if (editId) {
        const updated = await staffApi.update(editId, payload);
        setStaff((prev) => prev.map((s) => (s.id === editId ? updated : s)));
      } else {
        const created = await staffApi.create(payload);
        setStaff((prev) => [...prev, created]);
      }
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(member: StaffMember) {
    const newStatus = member.status === "attivo" ? "licenziato" : "attivo";
    try {
      const updated = await staffApi.update(member.id, { status: newStatus });
      setStaff((prev) => prev.map((s) => (s.id === member.id ? updated : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore aggiornamento");
    }
  }

  async function handleClock(staffId: string, action: "clock_in" | "clock_out") {
    try {
      const shift = await staffApi.clock(staffId, action);
      setShifts((prev) => {
        const idx = prev.findIndex((s) => s.id === shift.id);
        return idx >= 0 ? prev.map((s, i) => (i === idx ? shift : s)) : [...prev, shift];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore timbratura");
    }
  }

  function isClockIn(staffId: string) {
    const todayStr = today();
    return shifts.some(
      (s) => s.staffId === staffId && s.clockInAt?.slice(0, 10) === todayStr && !s.clockOutAt,
    );
  }

  const kpis = [
    { label: "Personale totale", value: totale, color: "text-rw-ink" },
    { label: "In servizio", value: attivi, color: "text-emerald-400" },
    { label: "In ferie", value: inFerie, color: "text-blue-400" },
    { label: "Malattia", value: inMalattia, color: "text-red-400" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Hotel" subtitle="Personale, ruoli, presenze e timbrature per la struttura alberghiera.">
        <button type="button" onClick={() => { resetForm(); setShowForm(true); }} className={btnPrimary}>
          <Plus className="h-4 w-4" /> Nuovo dipendente
        </button>
      </PageHeader>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
            <p className="text-sm text-rw-muted">{k.label}</p>
            <p className={cn("mt-2 font-display text-3xl font-semibold", k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Form add/edit */}
      {showForm && (
        <Card title={editId ? "Modifica dipendente" : "Aggiungi dipendente hotel"} description="Compila i campi e salva">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelCls}>Nome completo *</label>
                <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Mario Rossi" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Ruolo *</label>
                <select value={fRole} onChange={(e) => setFRole(e.target.value as HotelRole)} className={inputCls}>
                  {HOTEL_ROLES.map((r) => (
                    <option key={r} value={r}>{HOTEL_ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="mario@hotel.it" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Telefono</label>
                <input value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="+39 333 000 0000" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Data assunzione</label>
                <input type="date" value={fHireDate} onChange={(e) => setFHireDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Stipendio mensile (€)</label>
                <input type="number" value={fSalary} onChange={(e) => setFSalary(e.target.value)} placeholder="1500" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Ore/settimana contratto</label>
                <input type="number" value={fHoursWeek} onChange={(e) => setFHoursWeek(e.target.value)} placeholder="40" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Note</label>
                <input value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="Note opzionali…" className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => void handleSave()} disabled={saving || !fName.trim()} className={btnPrimary}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Salvataggio…" : editId ? "Aggiorna" : "Aggiungi"}
              </button>
              <button type="button" onClick={resetForm} className={btnGhost}>Annulla</button>
            </div>
          </div>
        </Card>
      )}

      {/* Staff table */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-rw-muted py-8 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Caricamento…
        </div>
      ) : (
        <Card title={`Personale hotel (${hotelStaff.length})`} description="Gestione dipendenti struttura alberghiera">
          {hotelStaff.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Users className="h-12 w-12 text-rw-line" />
              <p className="text-sm text-rw-muted">Nessun dipendente hotel ancora. Aggiungine uno!</p>
              <button type="button" onClick={() => setShowForm(true)} className={btnPrimary}>
                <Plus className="h-4 w-4" /> Aggiungi primo dipendente
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                { key: "name", header: "Nome", render: (m) => <span className="font-semibold text-rw-ink">{m.name}</span> },
                { key: "role", header: "Ruolo", render: (m) => (
                  <span className="rounded-md bg-rw-accent/10 px-2 py-0.5 text-xs font-semibold text-rw-accent">{hotelRoleLabel(m.role)}</span>
                )},
                { key: "status", header: "Stato", render: (m) => {
                  const colors: Record<string, string> = { attivo: "text-emerald-400", ferie: "text-blue-400", malattia: "text-red-400", licenziato: "text-rw-muted line-through" };
                  return <span className={cn("text-sm font-medium capitalize", colors[m.status] ?? "text-rw-muted")}>{m.status}</span>;
                }},
                { key: "email", header: "Email", render: (m) => <span className="text-xs text-rw-muted">{m.email || "—"}</span> },
                { key: "phone", header: "Telefono", render: (m) => <span className="text-xs text-rw-muted">{m.phone || "—"}</span> },
                { key: "hoursWeek", header: "H/sett.", render: (m) => <span className="text-sm">{m.hoursWeek}h</span> },
                { key: "hireDate", header: "Assunto", render: (m) => (
                  <span className="text-xs text-rw-muted">{m.hireDate ? new Date(m.hireDate).toLocaleDateString("it-IT") : "—"}</span>
                )},
                { key: "actions", header: "", render: (m) => {
                  const clocked = isClockIn(m.id);
                  return (
                    <div className="flex items-center gap-1.5 justify-end">
                      <button type="button" onClick={() => void handleClock(m.id, clocked ? "clock_out" : "clock_in")}
                        className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition",
                          clocked ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25" : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25")}>
                        {clocked ? <LogOut className="h-3 w-3" /> : <LogIn className="h-3 w-3" />}
                        {clocked ? "Uscita" : "Entrata"}
                      </button>
                      <button type="button" onClick={() => openEdit(m)}
                        className="flex items-center gap-1 rounded-lg bg-rw-surfaceAlt px-2 py-1 text-xs text-rw-muted hover:text-rw-ink transition">
                        <Edit className="h-3 w-3" /> Modifica
                      </button>
                      <button type="button" onClick={() => void handleToggleStatus(m)} className="text-rw-muted hover:text-rw-ink transition">
                        {m.status === "attivo" ? <ToggleRight className="h-5 w-5 text-emerald-400" /> : <ToggleLeft className="h-5 w-5" />}
                      </button>
                    </div>
                  );
                }},
              ]}
              data={hotelStaff}
              keyExtractor={(m) => m.id}
              emptyMessage="Nessun dipendente hotel."
            />
          )}
        </Card>
      )}

      {/* Badge QR & NFC */}
      {!loading && <HotelBadgesCard staff={hotelStaff} />}

      {/* Today's timbrature */}
      {!loading && shifts.length > 0 && (
        <Card title="Timbrature di oggi" description="Ingresso/uscita del personale hotel nella giornata corrente">
          <div className="space-y-2">
            {shifts
              .filter((s) => {
                const member = hotelStaff.find((m) => m.id === s.staffId);
                return member && s.clockInAt.slice(0, 10) === today();
              })
              .sort((a, b) => a.clockInAt.localeCompare(b.clockInAt))
              .map((s) => {
                const member = hotelStaff.find((m) => m.id === s.staffId);
                if (!member) return null;
                const dur = s.durationHours ?? (s.clockOutAt
                  ? (new Date(s.clockOutAt).getTime() - new Date(s.clockInAt).getTime()) / 3_600_000
                  : null);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5"
                  >
                    <div>
                      <span className="font-semibold text-sm text-rw-ink">{member.name}</span>
                      <span className="ml-2 text-xs text-rw-muted">{hotelRoleLabel(member.role)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <LogIn className="h-3 w-3" />
                        {new Date(s.clockInAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {s.clockOutAt ? (
                        <span className="flex items-center gap-1 text-amber-400">
                          <LogOut className="h-3 w-3" />
                          {new Date(s.clockOutAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : (
                        <span className="text-rw-muted">In servizio</span>
                      )}
                      {dur !== null && (
                        <span className="flex items-center gap-1 text-rw-muted">
                          <Clock className="h-3 w-3" />
                          {dur.toFixed(1)}h
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}
    </div>
  );
}
