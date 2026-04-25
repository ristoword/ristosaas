"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, DollarSign, Loader2, LogIn, LogOut } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { TabBar } from "@/components/shared/tab-bar";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { staffApi, shiftPlansApi, type StaffMember, type StaffShift, type ShiftPlan } from "@/lib/api-client";
import { addDaysIso, formatHumanDate, todayIso } from "@/lib/date-utils";
import { isHotelRole, hotelRoleLabel } from "@/components/hotel/hotel-staff-page";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "presenze", label: "Presenze oggi" },
  { id: "mese", label: "Riepilogo ore" },
  { id: "ferie", label: "Prospetto ferie / assenze" },
  { id: "costi", label: "Costo personale" },
];

const euro = (n: number) => `€ ${n.toLocaleString("it-IT", { maximumFractionDigits: 2 })}`;

function formatTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function computeDuration(shift: StaffShift): number {
  if (shift.durationHours !== null) return shift.durationHours;
  if (!shift.clockOutAt) return 0;
  const ms = new Date(shift.clockOutAt).getTime() - new Date(shift.clockInAt).getTime();
  return ms > 0 ? ms / 3_600_000 : 0;
}

export function HotelStaffHrPage() {
  const [tab, setTab] = useState("presenze");
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [shiftPlans, setShiftPlans] = useState<ShiftPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = todayIso();
  const monthStart = today.slice(0, 7) + "-01";
  const monthEnd = addDaysIso(
    new Date(today.slice(0, 7) + "-01").toISOString().slice(0, 10),
    new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate() - 1,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [staffRows, shiftRows, planRows] = await Promise.all([
        staffApi.list(),
        staffApi.listShifts({ from: monthStart, to: addDaysIso(today, 1) }),
        shiftPlansApi.list({ from: monthStart, to: monthEnd }),
      ]);
      setAllStaff(staffRows);
      setShifts(shiftRows);
      setShiftPlans(planRows);
    } catch (err) {
      setError((err as Error).message ?? "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, [monthStart, today, monthEnd]);

  useEffect(() => { void load(); }, [load]);

  const staff = useMemo(() => allStaff.filter((s) => isHotelRole(s.role)), [allStaff]);

  const staffIds = useMemo(() => new Set(staff.map((s) => s.id)), [staff]);

  const hotelShifts = useMemo(
    () => shifts.filter((s) => staffIds.has(s.staffId)),
    [shifts, staffIds],
  );

  const hotelPlans = useMemo(
    () => shiftPlans.filter((p) => p.staffId && staffIds.has(p.staffId)),
    [shiftPlans, staffIds],
  );

  const todayRows = useMemo(() => {
    return hotelShifts
      .filter((s) => s.clockInAt.slice(0, 10) === today)
      .map((s) => {
        const member = staff.find((m) => m.id === s.staffId);
        return {
          id: s.id,
          staffId: s.staffId,
          name: member?.name ?? s.staffId,
          role: member?.role ?? "—",
          clockIn: s.clockInAt,
          clockOut: s.clockOutAt,
          hours: computeDuration(s),
        };
      })
      .sort((a, b) => (a.clockIn ?? "").localeCompare(b.clockIn ?? ""));
  }, [hotelShifts, staff, today]);

  const monthAggregates = useMemo(() => {
    const byStaff = new Map(
      staff.map((m) => [m.id, { staffId: m.id, name: m.name, role: m.role, hours: 0, salary: m.salary ?? 0 }]),
    );
    for (const s of hotelShifts) {
      const bucket = byStaff.get(s.staffId);
      if (bucket) bucket.hours += computeDuration(s);
    }
    return Array.from(byStaff.values()).sort((a, b) => b.hours - a.hours);
  }, [staff, hotelShifts]);

  const ferieAggregates = useMemo(() => {
    type Row = { name: string; role: string; daysFerie: number; daysMalattia: number; daysPermesso: number; daysRiposo: number; hoursLavoro: number };
    const map = new Map<string, Row>();
    for (const m of staff) {
      map.set(m.id, { name: m.name, role: m.role, daysFerie: 0, daysMalattia: 0, daysPermesso: 0, daysRiposo: 0, hoursLavoro: 0 });
    }
    for (const p of hotelPlans) {
      if (!p.staffId) continue;
      const row = map.get(p.staffId);
      if (!row) continue;
      if (p.shiftType === "ferie") row.daysFerie++;
      else if (p.shiftType === "malattia") row.daysMalattia++;
      else if (p.shiftType === "permesso") row.daysPermesso++;
      else if (p.shiftType === "riposo") row.daysRiposo++;
      else if (p.shiftType === "lavoro") {
        if (p.startTime && p.endTime) {
          const [sh, sm] = p.startTime.split(":").map(Number);
          const [eh, em] = p.endTime.split(":").map(Number);
          const mins = (eh * 60 + em) - (sh * 60 + sm);
          if (mins > 0) row.hoursLavoro += mins / 60;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [staff, hotelPlans]);

  const totalHours = monthAggregates.reduce((s, r) => s + r.hours, 0);
  const totalSalary = monthAggregates.reduce((s, r) => s + r.salary, 0);
  const activeStaff = staff.filter((s) => s.status === "attivo").length;

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

  function isClocked(staffId: string) {
    return hotelShifts.some(
      (s) => s.staffId === staffId && s.clockInAt.slice(0, 10) === today && !s.clockOutAt,
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Hotel"
        subtitle={`Presenze, ferie e ore del personale alberghiero — ${formatHumanDate(today)}`}
      />

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Carico turni e personale…
        </div>
      )}

      {tab === "presenze" && !loading && (
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

          <Card title="Presenze hotel oggi" description="Timbrature registrate e in corso">
            {todayRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-rw-muted">Nessuna timbratura oggi.</p>
            ) : (
              <DataTable
                columns={[
                  { key: "name", header: "Dipendente", render: (r) => <span className="font-semibold text-rw-ink">{r.name}</span> },
                  { key: "role", header: "Ruolo", render: (r) => <span className="text-xs text-rw-muted">{hotelRoleLabel(r.role)}</span> },
                  { key: "clockIn", header: "Entrata", render: (r) => (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs"><LogIn className="h-3 w-3" /> {formatTime(r.clockIn)}</span>
                  )},
                  { key: "clockOut", header: "Uscita", render: (r) => r.clockOut
                    ? <span className="flex items-center gap-1 text-amber-400 text-xs"><LogOut className="h-3 w-3" /> {formatTime(r.clockOut)}</span>
                    : <span className="text-xs text-rw-muted">In servizio</span>
                  },
                  { key: "hours", header: "Ore", render: (r) => (
                    <span className="flex items-center gap-1 text-xs"><Clock className="h-3 w-3 text-rw-muted" />{r.hours > 0 ? `${r.hours.toFixed(1)}h` : "—"}</span>
                  )},
                  { key: "actions", header: "", render: (r) => (
                    <button type="button" onClick={() => void handleClock(r.staffId, r.clockOut ? "clock_in" : "clock_out")}
                      className={cn("rounded-lg px-2 py-1 text-xs font-semibold transition",
                        r.clockOut ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25")}>
                      {r.clockOut ? "Nuovo turno" : "Chiudi turno"}
                    </button>
                  )},
                ]}
                data={todayRows}
                keyExtractor={(r) => r.id}
              />
            )}
          </Card>

          <Card title="Timbratura rapida" description="Avvia o chiudi il turno per un dipendente hotel">
            <div className="flex flex-wrap gap-2">
              {staff.filter((s) => s.status === "attivo").map((m) => {
                const clocked = isClocked(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => void handleClock(m.id, clocked ? "clock_out" : "clock_in")}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
                      clocked
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
                    )}
                  >
                    {clocked ? <LogOut className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
                    {m.name}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {tab === "mese" && !loading && (
        <Card
          title={`Riepilogo ore — ${new Date(monthStart + "T12:00:00").toLocaleDateString("it-IT", { month: "long", year: "numeric" })}`}
          description={`${totalHours.toFixed(1)} ore totali • ${staff.length} dipendenti`}
        >
          <DataTable
            columns={[
              { key: "name", header: "Dipendente", render: (r) => <span className="font-semibold text-rw-ink">{r.name}</span> },
              { key: "role", header: "Ruolo", render: (r) => <span className="text-xs text-rw-muted">{hotelRoleLabel(r.role)}</span> },
              { key: "hours", header: "Ore mese", render: (r) => <span className="font-mono text-sm">{r.hours.toFixed(1)}h</span> },
              { key: "contract", header: "H/sett. contratto", render: (r) => {
                const m = staff.find((s) => s.id === r.staffId);
                const c = (m?.hoursWeek ?? 40) * 4;
                return <span className="text-sm text-rw-muted">{m?.hoursWeek ?? 40}h × 4 = {c}h</span>;
              }},
              { key: "diff", header: "Δ vs contratto", render: (r) => {
                const m = staff.find((s) => s.id === r.staffId);
                const diff = r.hours - (m?.hoursWeek ?? 40) * 4;
                return <span className={cn("text-sm font-semibold", diff >= 0 ? "text-emerald-400" : "text-red-400")}>{diff >= 0 ? "+" : ""}{diff.toFixed(1)}h</span>;
              }},
            ]}
            data={monthAggregates}
            keyExtractor={(r) => r.staffId}
          />
        </Card>
      )}

      {tab === "ferie" && !loading && (
        <Card title="Prospetto ferie e assenze" description={`Pianificazioni dal ${monthStart} al ${monthEnd}`}>
          <DataTable
            columns={[
              { key: "name", header: "Dipendente", render: (r) => <span className="font-semibold text-rw-ink">{r.name}</span> },
              { key: "role", header: "Ruolo", render: (r) => <span className="text-xs text-rw-muted">{hotelRoleLabel(r.role)}</span> },
              { key: "hoursLavoro", header: "Ore pianificate", render: (r) => <span className="font-mono text-sm">{r.hoursLavoro > 0 ? `${r.hoursLavoro.toFixed(1)}h` : "—"}</span> },
              { key: "ferie", header: "Ferie (gg)", render: (r) => <span className={cn("text-sm font-semibold", r.daysFerie > 0 ? "text-blue-400" : "text-rw-muted")}>{r.daysFerie > 0 ? r.daysFerie : "—"}</span> },
              { key: "malattia", header: "Malattia (gg)", render: (r) => <span className={cn("text-sm font-semibold", r.daysMalattia > 0 ? "text-red-400" : "text-rw-muted")}>{r.daysMalattia > 0 ? r.daysMalattia : "—"}</span> },
              { key: "permesso", header: "Permesso (gg)", render: (r) => <span className={cn("text-sm font-semibold", r.daysPermesso > 0 ? "text-amber-400" : "text-rw-muted")}>{r.daysPermesso > 0 ? r.daysPermesso : "—"}</span> },
              { key: "riposo", header: "Riposo (gg)", render: (r) => <span className={cn("text-sm font-semibold", r.daysRiposo > 0 ? "text-slate-400" : "text-rw-muted")}>{r.daysRiposo > 0 ? r.daysRiposo : "—"}</span> },
            ]}
            data={ferieAggregates}
            keyExtractor={(r) => r.name}
          />
          {ferieAggregates.every((r) => r.daysFerie === 0 && r.daysMalattia === 0 && r.daysPermesso === 0 && r.daysRiposo === 0) && (
            <p className="mt-4 text-center text-sm text-rw-muted">Nessuna assenza pianificata nel mese corrente. Usa la pagina Turni Hotel per pianificarle.</p>
          )}
        </Card>
      )}

      {tab === "costi" && !loading && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card title="Costo personale mese"><p className="font-display text-3xl font-semibold text-rw-ink">{euro(totalSalary)}</p></Card>
            <Card title="Ore lavorate mese"><p className="font-display text-3xl font-semibold text-rw-accent">{totalHours.toFixed(1)}h</p></Card>
            <Card title="Costo orario medio"><p className="font-display text-3xl font-semibold text-rw-ink">{totalHours > 0 ? euro(totalSalary / totalHours) : "—"}</p></Card>
          </div>
          <Card title="Dettaglio costo per dipendente" description="Stipendio mensile contrattuale">
            <DataTable
              columns={[
                { key: "name", header: "Dipendente", render: (r) => <span className="font-semibold text-rw-ink">{r.name}</span> },
                { key: "role", header: "Ruolo", render: (r) => <span className="text-xs text-rw-muted">{hotelRoleLabel(r.role)}</span> },
                { key: "salary", header: "Stipendio mensile", render: (r) => <span className="flex items-center gap-1 text-sm"><DollarSign className="h-3.5 w-3.5 text-rw-muted" />{euro(r.salary)}</span> },
                { key: "hours", header: "Ore lavorate", render: (r) => <span className="font-mono text-sm">{r.hours.toFixed(1)}h</span> },
                { key: "costHour", header: "Costo/ora effettivo", render: (r) => <span className="text-sm font-semibold text-rw-ink">{r.hours > 0 ? euro(r.salary / r.hours) : "—"}</span> },
              ]}
              data={monthAggregates}
              keyExtractor={(r) => r.staffId}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
