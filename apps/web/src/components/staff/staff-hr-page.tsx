"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  DollarSign,
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

const tabs = [
  { id: "presenze", label: "Presenze oggi" },
  { id: "mese", label: "Riepilogo ore" },
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

export function StaffHrPage() {
  const [tab, setTab] = useState<string>("presenze");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = todayIso();
  const monthStart = today.slice(0, 7) + "-01";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [staffRows, shiftRows] = await Promise.all([
        staffApi.list(),
        staffApi.listShifts({ from: monthStart, to: addDaysIso(today, 1) }),
      ]);
      setStaff(staffRows);
      setShifts(shiftRows);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestione personale"
        subtitle={`Presenze e ore dal DB reale — aggiornato ${formatHumanDate(today)}`}
      />

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
