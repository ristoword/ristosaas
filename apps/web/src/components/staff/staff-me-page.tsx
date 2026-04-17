"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  Info,
  Loader2,
  LogIn,
  LogOut,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { useAuth } from "@/components/auth/auth-context";
import { staffApi, type StaffMember, type StaffShift } from "@/lib/api-client";
import { addDaysIso, formatHumanDate, todayIso } from "@/lib/date-utils";

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

export function StaffMePage() {
  const { user } = useAuth();
  const [member, setMember] = useState<StaffMember | null>(null);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clocking, setClocking] = useState<"in" | "out" | null>(null);

  const today = todayIso();
  const monthStart = today.slice(0, 7) + "-01";

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const all = await staffApi.list();
      const mine =
        all.find((s) => s.email.toLowerCase() === (user.email || "").toLowerCase()) ??
        all.find((s) => s.name.toLowerCase() === (user.name || user.username || "").toLowerCase()) ??
        null;
      setMember(mine);

      if (mine) {
        const myShifts = await staffApi.listShifts({
          staffId: mine.id,
          from: monthStart,
          to: addDaysIso(today, 1),
        });
        setShifts(myShifts);
      } else {
        setShifts([]);
      }
    } catch (err) {
      setError((err as Error).message || "Errore caricamento profilo");
    } finally {
      setLoading(false);
    }
  }, [user, monthStart, today]);

  useEffect(() => {
    void load();
  }, [load]);

  const openShift = useMemo(() => shifts.find((s) => !s.clockOutAt) ?? null, [shifts]);
  const monthHours = shifts.reduce((s, sh) => s + computeDuration(sh), 0);

  async function handleClock(action: "clock_in" | "clock_out") {
    if (!member) return;
    setClocking(action === "clock_in" ? "in" : "out");
    try {
      await staffApi.clock(member.id, action);
      await load();
    } catch (err) {
      setError((err as Error).message || "Errore timbratura");
    } finally {
      setClocking(null);
    }
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-6 text-sm text-rw-muted">
        Devi essere autenticato per vedere questa pagina.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Il mio profilo"
        subtitle={`Dati reali dal tuo account — ${formatHumanDate(today)}`}
      />

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Carico profilo e turni…
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rw-accent/15 font-display text-2xl font-bold text-rw-accent ring-2 ring-rw-accent/30">
              {(user.name || user.username || "").slice(0, 2).toUpperCase() || "U"}
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-rw-ink">
                {user.name || user.username}
              </p>
              <Chip label={member?.role || user.role} tone="accent" className="mt-1" />
            </div>
            <div className="mt-2 w-full space-y-2 text-left">
              <div className="flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs text-rw-soft">
                <User className="h-3.5 w-3.5 text-rw-accent" />
                {user.email || "—"}
              </div>
              {member && (
                <>
                  <div className="flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs text-rw-soft">
                    <Clock className="h-3.5 w-3.5 text-rw-accent" />
                    Assunto il {formatHumanDate(member.hireDate)}
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs text-rw-soft">
                    <Clock className="h-3.5 w-3.5 text-rw-accent" />
                    {member.hoursWeek}h contrattuali / settimana
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        <Card title="Timbratura" className="lg:col-span-2">
          {!member ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              Il tuo account utente non è ancora collegato ad un record staff. Chiedi
              all&apos;owner di aggiungerti da <code>/owner</code> con la stessa email.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">
                    Turno corrente
                  </p>
                  <p className="mt-1 font-display text-xl font-semibold text-rw-ink">
                    {openShift ? `Entrato alle ${formatTime(openShift.clockInAt)}` : "Nessun turno aperto"}
                  </p>
                </div>
                <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">
                    Ore totali del mese
                  </p>
                  <p className="mt-1 font-display text-xl font-semibold text-rw-accent">
                    {monthHours.toFixed(1)}h
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleClock("clock_in")}
                  disabled={clocking !== null || openShift !== null}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-2.5 text-sm font-semibold text-emerald-300 disabled:opacity-50"
                >
                  {clocking === "in" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  Timbra entrata
                </button>
                <button
                  type="button"
                  onClick={() => handleClock("clock_out")}
                  disabled={clocking !== null || openShift === null}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-300 disabled:opacity-50"
                >
                  {clocking === "out" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  Timbra uscita
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card
        title="Mie presenze del mese"
        headerRight={<Chip label="Questo mese" value={`${monthHours.toFixed(1)}h`} tone="accent" />}
      >
        <DataTable
          columns={[
            {
              key: "clockInAt",
              header: "Data",
              render: (r) => (
                <span className="font-semibold text-rw-ink">
                  {formatHumanDate(r.clockInAt.slice(0, 10))}
                </span>
              ),
            },
            {
              key: "clockIn",
              header: "Entrata",
              render: (r) => (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <LogIn className="h-3.5 w-3.5" /> {formatTime(r.clockInAt)}
                </span>
              ),
            },
            {
              key: "clockOut",
              header: "Uscita",
              render: (r) => (
                <span className="inline-flex items-center gap-1 text-red-400">
                  <LogOut className="h-3.5 w-3.5" /> {formatTime(r.clockOutAt)}
                </span>
              ),
            },
            {
              key: "hours",
              header: "Ore",
              render: (r) => <span className="tabular-nums">{computeDuration(r).toFixed(2)}h</span>,
            },
          ]}
          data={[...shifts].sort((a, b) => b.clockInAt.localeCompare(a.clockInAt))}
          keyExtractor={(r) => r.id}
          emptyMessage="Nessuna timbratura questo mese."
        />
      </Card>

      <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 text-rw-accent" />
          <div>
            <p className="font-semibold text-rw-ink">Ferie, permessi, paghe e documenti</p>
            <p className="text-xs text-rw-muted">
              Saranno disponibili quando il modulo payroll/HR avanzato verrà integrato con il
              gestionale. In attesa mostriamo solo dati reali (profilo, contratto, turni e
              timbrature).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
