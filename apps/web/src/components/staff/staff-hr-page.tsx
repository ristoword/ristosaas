"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  Download,
  DollarSign,
  ExternalLink,
  Info,
  Loader2,
  LogIn,
  LogOut,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { TabBar } from "@/components/shared/tab-bar";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import {
  staffApi,
  type StaffMember,
  type StaffShift,
} from "@/lib/api-client";
import { addDaysIso, formatHumanDate, todayIso } from "@/lib/date-utils";
import { shiftPlansApi, type ShiftPlan, type LeaveApproval } from "@/lib/api-client";

const tabs = [
  { id: "presenze", label: "Presenze oggi" },
  { id: "mese", label: "Riepilogo ore" },
  { id: "ferie", label: "Calendario ferie" },
  { id: "costi", label: "Costo personale" },
];

const euro = (n: number) => `€ ${n.toLocaleString("it-IT", { maximumFractionDigits: 2 })}`;

function formatTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function computeDuration(shift: StaffShift): number {
  if (shift.durationHours !== null) return shift.durationHours;
  if (!shift.clockOutAt) return 0;
  const ms = new Date(shift.clockOutAt).getTime() - new Date(shift.clockInAt).getTime();
  return ms > 0 ? ms / 3_600_000 : 0;
}

type RowToday = {
  id: string;
  staffId: string;
  name: string;
  role: string;
  clockIn: string | null;
  clockOut: string | null;
  hours: number;
};

const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const SHIFT_TYPE_COLORS: Record<string, string> = {
  ferie: "bg-blue-500/20 text-blue-400",
  malattia: "bg-red-500/20 text-red-400",
  permesso: "bg-amber-500/20 text-amber-400",
  riposo: "bg-slate-500/20 text-slate-400",
};

function FerieCalendar({ staff, shiftPlans: initialPlans, today }: { staff: StaffMember[]; shiftPlans: ShiftPlan[]; today: string }) {
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)) - 1);
  const [filterStaff, setFilterStaff] = useState<string>("all");
  const [plans, setPlans] = useState(initialPlans);

  async function handleApproval(id: string, leaveApproval: LeaveApproval) {
    const updated = await shiftPlansApi.update(id, { leaveApproval }).catch(() => null);
    if (updated) setPlans((prev) => prev.map((p) => p.id === id ? { ...p, leaveApproval } : p));
  }

  const assenze = plans.filter((p) =>
    ["ferie", "malattia", "permesso", "riposo"].includes(p.shiftType) &&
    p.day.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`) &&
    (filterStaff === "all" || p.staffId === filterStaff || p.staffName === filterStaff),
  );

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const rows = Math.ceil((startOffset + lastDay.getDate()) / 7);

  const byDay = assenze.reduce<Record<number, ShiftPlan[]>>((acc, p) => {
    const d = new Date(p.day + "T12:00:00").getDate();
    if (!acc[d]) acc[d] = [];
    acc[d].push(p);
    return acc;
  }, {});

  const summary = staff.map((s) => {
    const mine = assenze.filter((p) => p.staffId === s.id || p.staffName === s.name);
    return { name: s.name, ferie: mine.filter((p) => p.shiftType === "ferie").length, malattia: mine.filter((p) => p.shiftType === "malattia").length, permesso: mine.filter((p) => p.shiftType === "permesso").length };
  }).filter((s) => s.ferie + s.malattia + s.permesso > 0);

  return (
    <div className="space-y-4">
      <Card title={`Calendario ferie — ${MONTHS_IT[month]} ${year}`} description="Assenze pianificate dai turni">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); }}
              className="rounded-xl border border-rw-line px-2.5 py-1.5 text-xs text-rw-muted hover:bg-rw-surfaceAlt">◀</button>
            <span className="text-sm font-semibold text-rw-ink">{MONTHS_IT[month]} {year}</span>
            <button type="button" onClick={() => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); }}
              className="rounded-xl border border-rw-line px-2.5 py-1.5 text-xs text-rw-muted hover:bg-rw-surfaceAlt">▶</button>
          </div>
          <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)}
            className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs text-rw-ink focus:outline-none">
            <option value="all">Tutto il personale</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex gap-2 ml-auto">
            {Object.entries(SHIFT_TYPE_COLORS).map(([type, cls]) => (
              <span key={type} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${cls}`}>{type}</span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Lun","Mar","Mer","Gio","Ven","Sab","Dom"].map((d) => (
            <div key={d} className="py-1.5 text-center text-xs font-bold text-rw-muted">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: rows * 7 }, (_, i) => {
            const dayNum = i - startOffset + 1;
            if (dayNum < 1 || dayNum > lastDay.getDate()) return <div key={i} className="min-h-[64px] rounded-xl bg-rw-surfaceAlt/30" />;
            const dayPlans = byDay[dayNum] ?? [];
            const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const isToday = iso === today;
            return (
              <div key={i} className={`min-h-[64px] rounded-xl border p-1.5 ${isToday ? "border-rw-accent/50 bg-rw-accent/5" : "border-rw-line bg-rw-bg"}`}>
                <div className={`text-xs font-bold mb-1 ${isToday ? "text-rw-accent" : "text-rw-muted"}`}>{dayNum}</div>
                {dayPlans.map((p, idx) => (
                  <div key={idx} className={`rounded px-1 py-0.5 text-[9px] font-semibold truncate mb-0.5 ${SHIFT_TYPE_COLORS[p.shiftType] ?? "bg-rw-surfaceAlt text-rw-muted"} ${p.leaveApproval === "rejected" ? "opacity-40 line-through" : p.leaveApproval === "pending" ? "ring-1 ring-amber-400/60" : ""}`}>
                    {p.staffName.split(" ")[0]}
                    {p.leaveApproval === "pending" && "⏳"}
                    {p.leaveApproval === "rejected" && "✗"}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Pending leave requests */}
      {assenze.filter((p) => p.leaveApproval === "pending").length > 0 && (
        <Card title="Richieste in attesa di approvazione" description="Approva o rifiuta le assenze pianificate">
          <div className="space-y-2">
            {assenze.filter((p) => p.leaveApproval === "pending").map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                <div>
                  <span className="font-semibold text-rw-ink text-sm">{p.staffName}</span>
                  <span className="ml-2 text-xs text-rw-muted">{p.shiftType} · {p.day}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void handleApproval(p.id, "approved")}
                    className="rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 transition">
                    ✓ Approva
                  </button>
                  <button type="button" onClick={() => void handleApproval(p.id, "rejected")}
                    className="rounded-lg bg-red-500/15 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/25 transition">
                    ✗ Rifiuta
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {summary.length > 0 && (
        <Card title="Riepilogo assenze del mese" description="Per dipendente">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-rw-line text-xs font-semibold text-rw-muted">
                <th className="py-2 text-left">Dipendente</th>
                <th className="py-2 text-center text-blue-400">Ferie</th>
                <th className="py-2 text-center text-red-400">Malattia</th>
                <th className="py-2 text-center text-amber-400">Permesso</th>
              </tr></thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.name} className="border-b border-rw-line/40 hover:bg-rw-surfaceAlt/40">
                    <td className="py-2 font-semibold text-rw-ink">{s.name}</td>
                    <td className="py-2 text-center text-blue-400">{s.ferie > 0 ? `${s.ferie}g` : "—"}</td>
                    <td className="py-2 text-center text-red-400">{s.malattia > 0 ? `${s.malattia}g` : "—"}</td>
                    <td className="py-2 text-center text-amber-400">{s.permesso > 0 ? `${s.permesso}g` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {summary.length === 0 && (
        <p className="py-8 text-center text-sm text-rw-muted">Nessuna assenza pianificata per {MONTHS_IT[month]} {year}. Pianifica le ferie dalla pagina Turni.</p>
      )}
    </div>
  );
}

export function StaffHrPage() {
  const [tab, setTab] = useState<string>("presenze");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [shiftPlans, setShiftPlans] = useState<ShiftPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = todayIso();
  const monthStart = today.slice(0, 7) + "-01";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [staffRows, shiftRows, planRows] = await Promise.all([
        staffApi.list(),
        staffApi.listShifts({ from: monthStart, to: addDaysIso(today, 1) }),
        shiftPlansApi.list({ from: monthStart, to: addDaysIso(today, 31) }),
      ]);
      setStaff(staffRows);
      setShifts(shiftRows);
      setShiftPlans(planRows);
    } catch (err) {
      setError((err as Error).message || "Errore caricamento dati staff");
    } finally {
      setLoading(false);
    }
  }, [monthStart, today]);

  useEffect(() => {
    void load();
  }, [load]);

  const todayRows: RowToday[] = useMemo(() => {
    const rows: RowToday[] = [];
    for (const shift of shifts) {
      if (shift.clockInAt.slice(0, 10) !== today) continue;
      const member = staff.find((s) => s.id === shift.staffId);
      rows.push({
        id: shift.id,
        staffId: shift.staffId,
        name: member?.name ?? shift.staffId,
        role: member?.role ?? "—",
        clockIn: shift.clockInAt,
        clockOut: shift.clockOutAt,
        hours: computeDuration(shift),
      });
    }
    return rows.sort((a, b) => (a.clockIn ?? "").localeCompare(b.clockIn ?? ""));
  }, [shifts, staff, today]);

  const monthAggregates = useMemo(() => {
    const byStaff = new Map<string, { staffId: string; name: string; role: string; hours: number; salary: number }>();
    for (const member of staff) {
      byStaff.set(member.id, {
        staffId: member.id,
        name: member.name,
        role: member.role,
        hours: 0,
        salary: member.salary ?? 0,
      });
    }
    for (const shift of shifts) {
      const bucket = byStaff.get(shift.staffId);
      if (!bucket) continue;
      bucket.hours += computeDuration(shift);
    }
    return Array.from(byStaff.values()).sort((a, b) => b.hours - a.hours);
  }, [staff, shifts]);

  const totalHours = monthAggregates.reduce((sum, row) => sum + row.hours, 0);
  const totalSalary = monthAggregates.reduce((sum, row) => sum + row.salary, 0);
  const activeStaff = staff.filter((s) => s.status === "attivo").length;

  async function handleClockIn(staffId: string) {
    try {
      await staffApi.clock(staffId, "clock_in");
      await load();
    } catch (err) {
      setError((err as Error).message || "Errore clock-in");
    }
  }

  async function handleClockOut(staffId: string) {
    try {
      await staffApi.clock(staffId, "clock_out");
      await load();
    } catch (err) {
      setError((err as Error).message || "Errore clock-out");
    }
  }

  function exportCsv() {
    const rows = [
      ["Dipendente", "Ruolo", "Ore mese", "H/sett. contratto", "Differenza"],
      ...monthAggregates.map((r) => {
        const contractH = (staff.find((s) => s.id === r.staffId)?.hoursWeek ?? 40) * 4;
        return [r.name, r.role, r.hours.toFixed(1), String(contractH), (r.hours - contractH).toFixed(1)];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `presenze_${today.slice(0, 7)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestione personale"
        subtitle={`Presenze e ore dal DB reale — aggiornato ${formatHumanDate(today)}`}
      >
        <button type="button" onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-3 py-2 text-sm font-medium text-rw-muted hover:bg-rw-surfaceAlt hover:text-rw-ink transition">
          <Download className="h-4 w-4" /> Esporta CSV
        </button>
        <a href="/staff-hr/print" target="_blank"
          className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-3 py-2 text-sm font-medium text-rw-muted hover:bg-rw-surfaceAlt hover:text-rw-ink transition">
          <ExternalLink className="h-4 w-4" /> Stampa PDF
        </a>
      </PageHeader>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Carico turni e personale…
        </div>
      )}

      {tab === "presenze" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card title="Dipendenti attivi">
              <p className="font-display text-3xl font-semibold text-emerald-400">{activeStaff}</p>
            </Card>
            <Card title="Timbrature di oggi">
              <p className="font-display text-3xl font-semibold text-rw-accent">{todayRows.length}</p>
            </Card>
            <Card title="Ore cumulate oggi">
              <p className="font-display text-3xl font-semibold text-rw-ink">
                {todayRows.reduce((s, r) => s + r.hours, 0).toFixed(1)}h
              </p>
            </Card>
          </div>

          <Card title="Timbrature odierne">
            <DataTable
              columns={[
                {
                  key: "name",
                  header: "Dipendente",
                  render: (r) => <span className="font-semibold text-rw-ink">{r.name}</span>,
                },
                { key: "role", header: "Ruolo" },
                {
                  key: "clockIn",
                  header: "Entrata",
                  render: (r) => (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <LogIn className="h-3.5 w-3.5" /> {formatTime(r.clockIn)}
                    </span>
                  ),
                },
                {
                  key: "clockOut",
                  header: "Uscita",
                  render: (r) => (
                    <span className="inline-flex items-center gap-1 text-red-400">
                      <LogOut className="h-3.5 w-3.5" /> {formatTime(r.clockOut)}
                    </span>
                  ),
                },
                {
                  key: "hours",
                  header: "Ore",
                  render: (r) => <span className="tabular-nums">{r.hours.toFixed(2)}h</span>,
                },
                {
                  key: "actions",
                  header: "",
                  render: (r) =>
                    r.clockOut ? null : (
                      <button
                        type="button"
                        onClick={() => handleClockOut(r.staffId)}
                        className="rounded-lg bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400"
                      >
                        Timbra uscita
                      </button>
                    ),
                },
              ]}
              data={todayRows}
              keyExtractor={(r) => r.id}
              emptyMessage="Nessuna timbratura oggi."
            />
          </Card>

          <Card
            title="Apri turno manualmente"
            description="Se la timbratura automatica non è disponibile puoi aprire un turno per uno staff member."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {staff
                .filter((s) => s.status === "attivo")
                .map((member) => {
                  const openShift = shifts.find(
                    (sh) => sh.staffId === member.id && !sh.clockOutAt,
                  );
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-rw-ink">{member.name}</p>
                        <p className="text-xs text-rw-muted">{member.role}</p>
                      </div>
                      {openShift ? (
                        <button
                          type="button"
                          onClick={() => handleClockOut(member.id)}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400"
                        >
                          Uscita
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleClockIn(member.id)}
                          className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-400"
                        >
                          Entrata
                        </button>
                      )}
                    </div>
                  );
                })}
              {staff.filter((s) => s.status === "attivo").length === 0 && (
                <p className="col-span-full text-sm text-rw-muted">
                  Nessun dipendente attivo. Aggiungine uno dal pannello Owner.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === "mese" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card title="Ore del mese">
              <p className="font-display text-3xl font-semibold text-rw-accent">
                {totalHours.toFixed(1)}h
              </p>
            </Card>
            <Card title="Media per dipendente">
              <p className="font-display text-3xl font-semibold text-rw-ink">
                {activeStaff > 0 ? (totalHours / activeStaff).toFixed(1) : "0"}h
              </p>
            </Card>
            <Card title="Turni registrati">
              <p className="font-display text-3xl font-semibold text-rw-ink">{shifts.length}</p>
            </Card>
          </div>

          <Card title={`Ore per dipendente — ${formatHumanDate(monthStart)} → ${formatHumanDate(today)}`}>
            <DataTable
              columns={[
                {
                  key: "name",
                  header: "Dipendente",
                  render: (r) => <span className="font-semibold text-rw-ink">{r.name}</span>,
                },
                { key: "role", header: "Ruolo" },
                {
                  key: "hours",
                  header: "Ore",
                  render: (r) => <span className="font-semibold text-rw-accent">{r.hours.toFixed(1)}h</span>,
                },
                {
                  key: "salary",
                  header: "Retribuzione base",
                  render: (r) => <span className="tabular-nums">{euro(r.salary)}</span>,
                },
              ]}
              data={monthAggregates}
              keyExtractor={(r) => r.staffId}
              emptyMessage="Nessun turno registrato questo mese."
            />
          </Card>
        </div>
      )}

      {tab === "ferie" && (
        <FerieCalendar staff={staff} shiftPlans={shiftPlans} today={today} />
      )}

      {tab === "costi" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="Costo personale (anagrafica)">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-rw-accent" />
                <p className="font-display text-3xl font-semibold text-rw-ink">{euro(totalSalary)}</p>
              </div>
              <p className="mt-2 text-xs text-rw-muted">
                Somma del campo <code>salary</code> su tutti i dipendenti.
              </p>
            </Card>
            <Card title="Ore totali mese">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-rw-accent" />
                <p className="font-display text-3xl font-semibold text-rw-ink">{totalHours.toFixed(1)}h</p>
              </div>
            </Card>
          </div>

          <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 text-rw-accent" />
              <div>
                <p className="font-semibold text-rw-ink">Pagamenti, ferie e disciplina</p>
                <p className="text-xs text-rw-muted">
                  Sono gestiti da un modulo payroll dedicato (non ancora integrato con il gestionale).
                  Questi dati quindi non vengono più mostrati con valori finti: vedrai dati solo
                  quando il modulo HR avanzato sarà collegato al DB.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
